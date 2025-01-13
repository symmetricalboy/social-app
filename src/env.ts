import {Did} from '@atproto/api'

export const LOG_DEBUG = process.env.EXPO_PUBLIC_LOG_DEBUG || ''
export const LOG_LEVEL = (process.env.EXPO_PUBLIC_LOG_LEVEL || 'info') as
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'

export const APPVIEW_DID: Did = process.env.APPVIEW_DID || ''
