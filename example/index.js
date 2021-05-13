import {
  h,
  init,
  classModule,
  styleModule,
  eventListenersModule,
} from '../build/vdom.esm.js'

const container = document.getElementById('container')
var patch = init([classModule, styleModule, eventListenersModule])
const render = (vnode) => {
  patch(container, vnode)
}
render(
  h('button.my-class', {
    on: {
      click: () => console.log('click my-class'),
    },
    style: {
      width: '200px',
      height: '30px',
      color: '#11111'
    }
  },['this is a button'])
)
