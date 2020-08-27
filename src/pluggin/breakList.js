export default class BreakList {
  constructor() {
    this.list = [];
  }
  getList() {
    return this.list
  }
  checkElement(fileName) {
    if (this.list.includes(fileName)) {
      return true
    }
    return false
  }
  addElement(fileName) {
    this.list.push(fileName)
  }
  removeElement(fileName) {
    const index = this.list.findIndex(item => item === fileName)
    this.list.splice(index, 1)
  }
}
