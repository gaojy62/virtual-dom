import { VNode, VNodeData, vnode } from './vnode'
import * as is from './helpers/is'

export type VNodes = VNode[]
export type VNodeChildElement = VNode | string | number | undefined | null
export type ArrayOrElement<T> = T | T[]
export type VNodeChildren = ArrayOrElement<VNodeChildElement>

export function h(sel: string): VNode
export function h(sel: string, data: VNodeData | null): VNode
export function h(sel: string, children: VNodeChildren): VNode
export function h(
  sel: string,
  data: VNodeData | null,
  children: VNodeChildren
): VNode
export function h(sel: string, b?: any, c?: any): VNode {
  let data: VNodeData = {}
  let children: any
  let text: string | undefined
  let i: number
  // 三个参数时, b 为 data c 为 children
  if (c !== undefined) {
    if (b !== null) {
      data = b
    }
    if (is.isArray(c)) {
      // c 为子节点数组
      children = c
    } else if (is.isPrimitive(c)) {
      // c 为文本节点
      text = c + ''
    } else if (c && c.sel) {
      // c 为 vnode
      children = [c]
    }
    // 两个参数时， 判断 b 为 data 还是 children
  } else if (b !== undefined && b !== null) {
    if (is.isArray(b)) {
      children = b
    } else if (is.isPrimitive(b)) {
      text = b + ''
    } else if (b && b.sel) {
      children = [b]
    } else {
      data = b
    }
  }
  if (children !== undefined) {
    for (i = 0; i < children.length; i++) {
      if (is.isPrimitive(children[i])) {
        children[i] = vnode(
          undefined,
          undefined,
          undefined,
          children[i],
          undefined
        )
      }
    }
  }
  return vnode(sel, data, children, text, undefined)
}
