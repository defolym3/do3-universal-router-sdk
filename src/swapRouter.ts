import invariant from 'tiny-invariant'
import { abi } from '@uniswap/universal-router/artifacts/contracts/UniversalRouter.sol/UniversalRouter.json'
import { Interface } from '@ethersproject/abi'
import { BigNumber, BigNumberish } from 'ethers'
import { Trade as RouterTrade } from '@defolym3/do3-router-sdk'
import { Currency, TradeType } from '@defolym3/do3-sdk-core'
import { MethodParameters } from '@defolym3/do3-v3-sdk2'
import { Command, RouterTradeType } from './entities/Command'
import { UniswapTrade, SwapOptions } from './entities/protocols/uniswap'
import { UnwrapWETH } from './entities/protocols/unwrapWETH'
import { RoutePlanner } from './utils/routerCommands'
import { encodePermit } from './utils/inputTokens'
import { ROUTER_AS_RECIPIENT } from './utils/constants'

export type SwapRouterConfig = {
  sender?: string // address
  deadline?: BigNumberish
}

export abstract class SwapRouter {
  public static INTERFACE: Interface = new Interface(abi)

  public static swapCallParameters(trades: Command[] | Command, config: SwapRouterConfig = {}): MethodParameters {
    if (!Array.isArray(trades)) trades = [trades]

    const planner = new RoutePlanner()

    // track value flow to require the right amount of native value
    let currentNativeValueInRouter = BigNumber.from(0)
    let transactionValue = BigNumber.from(0)

    for (const trade of trades) {
      if (trade.tradeType == RouterTradeType.UniswapTrade) {
        const uniswapTrade = trade as UniswapTrade
        const inputIsNative = uniswapTrade.trade.inputAmount.currency.isNative
        const outputIsNative = uniswapTrade.trade.outputAmount.currency.isNative
        const swapOptions = uniswapTrade.options

        invariant(!(inputIsNative && !!swapOptions.inputTokenPermit), 'NATIVE_INPUT_PERMIT')

        if (!!swapOptions.inputTokenPermit) {
          encodePermit(planner, swapOptions.inputTokenPermit)
        }

        if (inputIsNative) {
          transactionValue = transactionValue.add(
            BigNumber.from(uniswapTrade.trade.maximumAmountIn(swapOptions.slippageTolerance).quotient.toString())
          )
        }
        // track amount of native currency in the router
        if (outputIsNative && swapOptions.recipient == ROUTER_AS_RECIPIENT) {
          currentNativeValueInRouter = currentNativeValueInRouter.add(
            BigNumber.from(uniswapTrade.trade.minimumAmountOut(swapOptions.slippageTolerance).quotient.toString())
          )
        }
        uniswapTrade.encode(planner, { allowRevert: false })
        /**
         * is UnwrapWETH
         */
      } else if (trade.tradeType == RouterTradeType.UnwrapWETH) {
        const UnwrapWETH = trade as UnwrapWETH
        trade.encode(planner, { allowRevert: false })
        currentNativeValueInRouter = currentNativeValueInRouter.add(UnwrapWETH.amount)
        /**
         * else
         */
      } else {
        throw 'trade must be of instance: UniswapTrade'
      }
    }

    return SwapRouter.encodePlan(planner, transactionValue, config)
  }

  /**
   * @deprecated in favor of swapCallParameters. Update before next major version 2.0.0
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade.
   * @param trades to produce call parameters for
   * @param options options for the call parameters
   */
  public static swapERC20CallParameters(
    trades: RouterTrade<Currency, Currency, TradeType>,
    options: SwapOptions
  ): MethodParameters {
    // TODO: use permit if signature included in swapOptions
    const planner = new RoutePlanner()

    const trade: UniswapTrade = new UniswapTrade(trades, options)

    const inputCurrency = trade.trade.inputAmount.currency
    invariant(!(inputCurrency.isNative && !!options.inputTokenPermit), 'NATIVE_INPUT_PERMIT')

    if (options.inputTokenPermit) {
      encodePermit(planner, options.inputTokenPermit)
    }

    const nativeCurrencyValue = inputCurrency.isNative
      ? BigNumber.from(trade.trade.maximumAmountIn(options.slippageTolerance).quotient.toString())
      : BigNumber.from(0)

    trade.encode(planner, { allowRevert: false })
    return SwapRouter.encodePlan(planner, nativeCurrencyValue, {
      deadline: options.deadlineOrPreviousBlockhash ? BigNumber.from(options.deadlineOrPreviousBlockhash) : undefined,
    })
  }

  /**
   * Encodes a planned route into a method name and parameters for the Router contract.
   * @param planner the planned route
   * @param nativeCurrencyValue the native currency value of the planned route
   * @param config the router config
   */
  private static encodePlan(
    planner: RoutePlanner,
    nativeCurrencyValue: BigNumber,
    config: SwapRouterConfig = {}
  ): MethodParameters {
    const { commands, inputs } = planner
    const functionSignature = !!config.deadline ? 'execute(bytes,bytes[],uint256)' : 'execute(bytes,bytes[])'
    const parameters = !!config.deadline ? [commands, inputs, config.deadline] : [commands, inputs]
    const calldata = SwapRouter.INTERFACE.encodeFunctionData(functionSignature, parameters)
    return { calldata, value: nativeCurrencyValue.toHexString() }
  }
}
