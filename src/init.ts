import { Module } from './modules/module'
import { vnode, VNode } from './vnode'
import * as is from './helpers/is'
import { htmlDomApi, DOMAPI } from './htmldomapi'

type KeyToIndexMap = { [key: string]: number }

const createKey2IndexMap = (
  children: VNode[],
  beginIndex: number,
  endIndex: number
): KeyToIndexMap => {
  const map: KeyToIndexMap = {}
  for (let i = beginIndex; i <= endIndex; i++) {
    const key = children[i]?.key
    if (key !== undefined) {
      map[key as string] = i
    }
  }
  return map
}

type ArrayOf<T> = {
  [K in keyof T]: Array<T[K]>
}
type ModuleHooks = ArrayOf<Required<Module>>
type VNodeQueue = VNode[]

type NonUndefined<T> = T extends undefined ? never : T

const emptyVnode = vnode('', {}, [], undefined, undefined)

function isDef<T>(s: T): s is NonUndefined<T> {
  return s !== undefined
}

function isUndef(s: unknown): boolean {
  return s === undefined
}

const hooks: Array<keyof Module> = [
  'create',
  'destory',
  'post',
  'pre',
  'remove',
  'update',
]

export function init(
  modules: Array<Partial<Module>>,
  domApi?: DOMAPI
): (oldVnode: VNode | Element, vnode: VNode) => VNode {
  let i: number, j: number
  const cbs: ModuleHooks = {
    create: [],
    destory: [],
    post: [],
    pre: [],
    remove: [],
    update: [],
  }
  // collect every module's hooks
  for (i = 0; i < hooks.length; i++) {
    cbs[hooks[i]] = []
    for (j = 0; j < modules.length; j++) {
      const hook = modules[j][hooks[i]]
      if (hook !== undefined) {
        ;(cbs[hooks[i]] as any[]).push(hook)
      }
    }
  }
  const api: DOMAPI = domApi || htmlDomApi

  function emptyVnodeAt(elm: Element): VNode {
    const id = elm.id ? '#' + elm.id : ''
    const cls = elm.className ? '.' + elm.className.split(' ').join('.') : ''
    return vnode(
      api.tagName(elm).toLocaleLowerCase() + id + cls,
      {},
      [],
      undefined,
      elm
    )
  }

  function createElm(vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
    let ns
    let data = vnode.data
    if (data !== undefined) {
      const init = data.hook?.init
      if (isDef(init)) {
        init(vnode)
        data = vnode.data
      }
    }
    const children = vnode.children
    const sel = vnode.sel
    if (sel === '!') {
      // comment Node
      if (isUndef(vnode.text)) {
        vnode.text = ''
      }
      vnode.elm = api.createComment(vnode.text!)
    } else if (sel !== undefined) {
      // element Node

      // get selector
      const hashIndex = sel.indexOf('#')
      const dotIndex = sel.indexOf('.', hashIndex)
      const hash = hashIndex > 0 ? hashIndex : sel.length
      const dot = dotIndex > 0 ? dotIndex : sel.length
      const tag =
        hashIndex !== -1 || dotIndex !== -1
          ? sel.slice(0, Math.min(hash, dot))
          : sel
      const elm = (vnode.elm =
        isDef(data) && isDef((ns = data.ns))
          ? api.createElementNS(ns, tag, data as ElementCreationOptions)
          : api.createElement(tag, data as ElementCreationOptions))
      if (hash < dot) elm.setAttribute('id', sel.slice(hash + 1, dot))
      if (dotIndex > 0) {
        // multiple class
        elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '))
      }
      // call module's create hook
      for (let i = 0; i < cbs.create.length; i++)
        cbs.create[i as number](emptyVnode, vnode)
      if (is.isArray(children)) {
        for (let i = 0; i < children.length; i++) {
          const ch = children[i]
          if (ch != null) {
            api.appendChild(elm, createElm(ch as VNode, insertedVnodeQueue))
          }
        }
      } else if (is.isPrimitive(vnode.text)) {
        api.appendChild(elm, api.createTextNode(vnode.text))
      }
      // vnode data hook
      const hook = vnode.data?.hook
      if (isDef(hook)) {
        hook.create?.(emptyVnode, vnode)
        if (hook.insert) {
          insertedVnodeQueue.push(vnode)
        }
      }
    } else {
      // text Node
      vnode.elm = api.createTextNode(vnode.text!)
    }
    return vnode.elm
  }

  function createRmCb(childElm: Node, listeners: number) {
    return function rmCb() {
      if (--listeners === 0) {
        const parent = api.parentNode(childElm)
        api.removeChild(parent!, childElm)
      }
    }
  }

  function invokeDestoryHook(vnode: VNode) {
    const data = vnode.data
    if (data !== undefined) {
      data?.hook?.destroy?.(vnode)
      for (let i = 0; i < cbs.destory.length; i++) cbs.destory[i](vnode)
      if (vnode.children !== undefined) {
        for (let j = 0; j < vnode.children.length; j++) {
          const child = vnode.children[j]
          if (child != null && typeof child != 'string') {
            invokeDestoryHook(child)
          }
        }
      }
    }
  }

  function removeVnodes(
    parentElm: Node,
    vnodes: VNode[],
    startIndex: number,
    endIndex: number
  ): void {
    for (; startIndex <= endIndex; startIndex++) {
      let listeners: number
      let rm: () => void
      const ch = vnodes[startIndex]
      if (ch != null) {
        if (isDef(ch.sel)) {
          // vnode
          invokeDestoryHook(ch)
          listeners = cbs.remove.length + 1
          // create rm callback, when all module's remove hook called, the rm callback can call
          rm = createRmCb(ch.elm!, listeners)
          // invoke module's remove hook
          for (let i = 0; i < cbs.remove.length; i++) cbs.remove[i](ch, rm)
          const removeHook = ch?.data?.hook?.remove
          if (isDef(removeHook)) {
            removeHook(ch, rm)
          } else {
            rm()
          }
        } else {
          // Text Node
          api.removeChild(parentElm, ch.elm!)
        }
      }
    }
  }

  function updateChildren(
    parentElm: Node,
    oldCh: Array<VNode>,
    newCh: Array<VNode>,
    insertedVnodeQueue: VNodeQueue
  ) {
    let oldStartIndex = 0
    let newStartIndex = 0
    let oldEndIndex = oldCh.length - 1
    let newEndIndex = newCh.length - 1
    let oldStartVnode = oldCh[oldStartIndex]
    let oldEndVnode = oldCh[oldEndIndex]
    let newStartVnode = newCh[newStartIndex]
    let newEndVnode = newCh[newEndIndex]
    let oldKey2Index: KeyToIndexMap | undefined
    let indexInOld: number
    let elmToMove: VNode
    let before: any
    while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
      if (oldStartVnode === null) {
        oldStartVnode = oldCh[++oldStartIndex]
      } else if (oldEndVnode === null) {
        oldEndVnode = oldCh[--oldEndIndex]
      } else if (newStartVnode === null) {
        newStartVnode = newCh[++newStartIndex]
      } else if (newEndVnode === null) {
        newEndVnode = newCh[--newEndIndex]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
        oldStartVnode = oldCh[++oldStartIndex]
        newStartVnode = newCh[++newStartIndex]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
        oldEndVnode = oldCh[--oldEndIndex]
        newEndVnode = newCh[--newEndIndex]
      } else if (sameVnode(oldEndVnode, newStartVnode)) {
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldEndVnode.elm!, oldStartVnode.elm!)
        oldEndVnode = oldCh[--oldEndIndex]
        newStartVnode = newCh[++newStartIndex]
      } else if (sameVnode(oldStartVnode, newEndVnode)) {
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
        api.insertBefore(
          parentElm,
          oldStartVnode.elm!,
          api.nextSibling(oldEndVnode.elm!)
        )
        oldStartVnode = oldCh[++oldStartIndex]
        newEndVnode = newCh[--newEndIndex]
      } else {
        if (oldKey2Index === undefined) {
          oldKey2Index = createKey2IndexMap(oldCh, oldStartIndex, oldEndIndex)
        }
        indexInOld = oldKey2Index[newStartVnode.key as string]
        if (isUndef(indexInOld)) {
          // new Node, insertBefore oldStartVnode
          api.insertBefore(
            parentElm,
            createElm(newStartVnode, insertedVnodeQueue),
            oldStartVnode.elm!
          )
        } else {
          elmToMove = oldCh[indexInOld]
          if (elmToMove.sel !== newStartVnode.sel) {
            api.insertBefore(
              parentElm,
              createElm(newStartVnode, insertedVnodeQueue),
              oldStartVnode.elm!
            )
          } else {
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
            oldCh[indexInOld] = undefined as any
            api.insertBefore(parentElm, elmToMove.elm!, oldStartVnode.elm!)
          }
        }
        newStartVnode = newCh[++newStartIndex]
      }
    }
    if (oldStartIndex <= oldEndIndex || newStartIndex <= newEndIndex) {
      if (oldStartIndex > oldEndIndex) {
        before =
          newCh[newEndIndex + 1] == null ? null : newCh[newEndIndex + 1].elm
        addVnodes(
          parentElm,
          before,
          newCh,
          newStartIndex,
          newEndIndex,
          insertedVnodeQueue
        )
      } else {
        removeVnodes(parentElm, oldCh, oldStartIndex, oldEndIndex)
      }
    }
  }

  function addVnodes(
    parentElm: Node,
    before: Node | null,
    vnodes: VNode[],
    startIdx: number,
    endIdx: number,
    insertedVnodeQueue: VNodeQueue
  ) {
    for (; startIdx <= endIdx; startIdx++) {
      const ch = vnodes[startIdx]
      if (ch != null) {
        api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before)
      }
    }
  }

  function patchVnode(
    oldVnode: VNode,
    vnode: VNode,
    insertedVnodeQueue: VNodeQueue
  ) {
    const hook = vnode.data?.hook
    hook?.prepatch?.(oldVnode, vnode)
    const elm = (vnode.elm = oldVnode.elm) as Node
    const oldCh = oldVnode.children as VNode[]
    const ch = vnode.children as VNode[]
    if (oldVnode === vnode) return
    if (vnode.data !== undefined) {
      for (let i = 0; i < cbs.update.length; i++) {
        cbs.update[i](oldVnode, vnode)
      }
      vnode.data.hook?.update?.(oldVnode, vnode)
    }
    // vnode Text Node is undefined
    if (isUndef(vnode.text)) {
      // vnode has Text Node
      if (isDef(oldCh) && isDef(ch)) {
        // both of all has children, compare children
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue)
      } else if (isDef(ch)) {
        // only vnode has children, remove old elm Text Node, and add vnode
        if (isDef(oldVnode.text)) {
          api.setTextContent(elm, '')
        }
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        // only oldvnode has children, remove children
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        // oldvnode & vnode is empty, clear elm's children
        api.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      }
      api.setTextContent(elm, vnode.text as string)
    }
    hook?.prepatch?.(oldVnode, vnode)
  }

  return function patch(oldVnode, vnode) {
    let i: number, elm: Node, parent: Node
    const insertedVnodeQueue: VNodeQueue = []
    // call pre hook
    for (i = 0; i < cbs.pre.length; i++) cbs.pre[i]()
    // if oldVnode is Element , create empty vnode by oldVnode
    if (!isVnode(oldVnode)) {
      oldVnode = emptyVnodeAt(oldVnode)
    }
    // compare two vnode
    if (sameVnode(oldVnode, vnode)) {
      // if two vnode sel & key is same, patch data, children...
      patchVnode(oldVnode, vnode, insertedVnodeQueue)
    } else {
      // otherwise, replace oldvnode
      elm = oldVnode.elm!
      parent = api.parentNode(elm) as Node
      createElm(vnode, insertedVnodeQueue)
      if (parent !== null) {
        api.insertBefore(parent, vnode.elm!, api.nextSibling(elm))
        removeVnodes(parent, [oldVnode], 0, 0)
      }
    }
    for (i = 0; i < insertedVnodeQueue.length; i++) {
      insertedVnodeQueue[i].data!.hook!.insert!(insertedVnodeQueue[i])
    }
    // call post hooks
    for (i = 0; i < cbs.post.length; i++) cbs.post[i]()
    return vnode
  }
}

function isVnode(vnode: any): vnode is VNode {
  return vnode?.sel !== undefined
}

function sameVnode(vnode1: VNode, vnode2: VNode): boolean {
  const isSameKey = vnode1.key === vnode2.key
  const isSameSel = vnode1.sel === vnode2.sel
  return isSameKey && isSameSel
}
