import { Hooks } from './hooks'

export interface VNode {
  sel: string | undefined
  data: VNodeData | undefined
  children: Array<VNode | string> | undefined
  key: Key | undefined
  elm: Node | undefined
  text: string | undefined
}

export type Key = string | number | symbol

export interface VNodeData {
  props?: Props
  attrs?: Attrs
  class?: Classes
  style?: VNodeStyle
  on?: On
  dataset?: DataSet
  key?: Key
  hook?: Hooks
  ns?: string // namespace
  [s: string]: unknown
}

export type Props = Record<string, unknown>
export type Attrs = Record<string, string | number | boolean>
export type Classes = Record<string, boolean>
export type VNodeStyle = Record<string, string> & {
  delayed?: Record<string, string>
  remove?: Record<string, string>
}
export type On = {
  [N in keyof HTMLElementEventMap]?:
    | Array<Listener<HTMLElementEventMap[N]>>
    | Listener<HTMLElementEventMap[N]>
} & {
  [event: string]: Listener<unknown> | Array<Listener<unknown>>
}
export type Listener<T> = (this: VNode, ev: T, vnode: VNode) => void
export type DataSet = {
  [s: string]: string
}

export function vnode(
  sel: string | undefined,
  data: VNodeData | undefined,
  children: Array<VNode | string> | undefined,
  text: string | undefined,
  elm: Element | Text | undefined
): VNode {
  const key = data?.key
  return {
    sel,
    data,
    children,
    text,
    elm,
    key,
  }
}
