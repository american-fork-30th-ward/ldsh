// state hook so I don't have to pass stuff down a bunch of times.
export default function createState(defaultValue) {
  return (() => {
    let state = defaultValue
    return [() => state, v => {state = v}]
  })()
}
