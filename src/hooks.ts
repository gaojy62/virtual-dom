import { VNode } from './vnode'

export type PreHook = () => unknown
export type InitHook = (vNode: VNode) => unknown

// createHook & updateHook use common function, so createHook need a emptyVnode
export type CreateHook = (emptyVNode: VNode, vNode: VNode) => unknown
export type UpdateHook = (oldVNode: VNode, vNode: VNode) => unknown

export type InsertHook = (vNode: VNode) => unknown
export type PrePatchHook = (oldVNode: VNode, vNode: VNode) => unknown
export type PostPatchHook = (oldVNode: VNode, vNode: VNode) => unknown
export type DestroyHook = (vNode: VNode) => unknown
export type RemoveHook = (vNode: VNode, removeCallBack: () => void) => unknown
export type PostHook = () => unknown


export interface Hooks {
  pre?: PreHook
  init?: InitHook
  create?: CreateHook
  insert?: InsertHook;
  prepatch?: PrePatchHook;
  update?: UpdateHook;
  postpatch?: PostPatchHook;
  destroy?: DestroyHook;
  remove?: RemoveHook;
  post?: PostHook;
}