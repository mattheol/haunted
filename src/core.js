import { commitSymbol, stateSymbol, phaseSymbol, updateSymbol } from './symbols.js';
import { setCurrent, clear } from './interface.js';
import { render } from 'https://unpkg.com/lit-html/lit-html.js';

function scheduler() {
  let tasks = [];
  let id;

  function runTasks() {
    id = null;
    let t = tasks;
    tasks = [];
    for(var i = 0, len = t.length; i < len; i++) {
      t[i]();
    }
  }

  return function(task) {
    tasks.push(task);
    if(id == null) {
      id = requestAnimationFrame(runTasks);
    }
  };
}

const read = scheduler();
const write = scheduler();

function component(renderer, BaseElement = HTMLElement) {
  return class extends BaseElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });

      
      this[phaseSymbol] = null;
      this[stateSymbol] = new Map();
      this._updateQueued = false;
    }

    connectedCallback() {
      this._update();
    }

    _update() {
      if(this._updateQueued) return;
      read(() => {
        let result = this._handlePhase(updateSymbol);
        write(() => {
          this._handlePhase(commitSymbol, result);
        });
        this._updateQueued = false;
      });
      this._updateQueued = true;
    }

    _handlePhase(phase, arg) {
      this[phaseSymbol] = phase;
      switch(phase) {
        case commitSymbol: return this._commit(arg);
        case updateSymbol: return this._render();
      }
      this[phaseSymbol] = null;
    }

    _commit(result) {
      render(result, this.shadowRoot);
      let effects = this[commitSymbol];
      if(effects) {
        for(let [,effect] of effects) {
          effect.call(this);
        }
      }
    }

    _render() {
      setCurrent(this);
      let result = renderer(this);
      clear();
      return result;
    }
  };
}

export { component };