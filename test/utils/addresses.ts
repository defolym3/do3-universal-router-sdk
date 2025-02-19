import { UNIVERSAL_ROUTER_ADDRESS } from '../../src/utils/constants'
import { CHAIN_ID } from './constants'
import { PERMIT2_ADDRESSES } from '@defolym3/do3-permit2-sdk'

export const MAINNET_ROUTER_ADDRESS = UNIVERSAL_ROUTER_ADDRESS(CHAIN_ID)
export const FORGE_ROUTER_ADDRESS = '0xe808c1cfeebb6cb36b537b82fa7c9eef31415a05'
export const FORGE_PERMIT2_ADDRESS = '0x4a873bdd49f7f9cc0a5458416a12973fab208f8d'

export const FORGE_SENDER_ADDRESS = '0xcf03dd0a894ef79cb5b601a43c4b25e3ae4c67ed'

export const TEST_RECIPIENT_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
export const TEST_FEE_RECIPIENT_ADDRESS = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

export const PERMIT2_ADDRESS =
  process.env.USE_MAINNET_DEPLOYMENT === 'true' ? PERMIT2_ADDRESSES[CHAIN_ID] : FORGE_PERMIT2_ADDRESS
// Universal Router address in tests
export const ROUTER_ADDRESS =
  process.env.USE_MAINNET_DEPLOYMENT === 'true' ? MAINNET_ROUTER_ADDRESS : FORGE_ROUTER_ADDRESS
