
function randomInteger(lowerInclusiveBound, upperExclusiveBound) {
  if (upperExclusiveBound === undefined) {
    upperExclusiveBound = lowerInclusiveBound;
    lowerInclusiveBound = 0;
  }
  return lowerInclusiveBound + Math.floor(Math.random() * (upperExclusiveBound - lowerInclusiveBound));
}

function choice(fromArray) {
  return fromArray[randomInteger(fromArray.length)];
}

function randomCoordinate(fieldWidth, fieldHeight) {
  return [randomInteger(fieldWidth), randomInteger(fieldHeight)];
}

function adjacentCoordinates([x, y], fieldWidth, fieldHeight, exclude = []) {
  return [
    [x+1, y],
    [x-1, y],
    [x, y+1],
    [x, y-1],
  ]
    .filter(([x, y]) => x > -1 && x < fieldWidth && y > -1 && y < fieldHeight)
    .filter(([x, y]) => {
      return !exclude.some(([x2, y2]) => x === x2 && y === y2);
    });
}


class Game extends Array {
  constructor(w, h) {
    if (h === undefined) {
      // when using this.map it calls new Game(v)
      super(w);
      return;
    }
    super(w*h);

    this.w = w;
    this.h = h;
    
    this.fill(0);

    this.path = [];
    this.prevPos = null;
    this.pathPos = -1;
    this.completed = false;
  }
  toString() {
    let s = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        s.push((this[y*this.w+x]+' ').padStart(3, ' '));
      }
      s.push('\n');
    }
    return s.join('');
  }
  generatePath(length) {
    if (length === undefined) {
      length = randomInteger(10, 18);
    }
    if (length > this.w*this.h*0.8) {
      throw new Error(`path length (${length}) too long for this field: ${this.w}x${this.h}`);
    }

    let path = [];
    let triesCount = 0;
    while (path.length < length) {
      triesCount += 1;

      // select first random position on field
      let coordinate = randomCoordinate(this.w, this.h);
      path.splice(0, path.length, coordinate);

      for (let i = 1; i < length; i++) {
        // neighbors of last position excluding all that are already part of path
        const neighbors = adjacentCoordinates(coordinate, this.w, this.h, path);

        if (neighbors.length === 0) {
          // dead end, no free neighbors left, start again
          break
        }
        coordinate = choice(neighbors);
        path.push(coordinate);
      };
    }
    // console.log('path generated in %s tries', triesCount);

    // do we need whole this model as array?
    path.forEach(([x, y], i) => {
      this[x+y*this.w] = i+1;
    });

    this.path = path.map(([x, y]) => x+y*this.w);

    return this;
  }
  enterPosition(pos) {
    if (pos === this.prevPos || this.pathPos === this.path.length-1) {
      // probably mousemove triggered twice on same cell
      return;
    }
    // const prevPos = this.prevPos;
    this.prevPos = pos;
    
    if (this.path[this.pathPos+1] === pos) {
      this.pathPos++;

      switch (this.pathPos) {
        case 0: 
          return 'path-start';
        case this.path.length-1: 
          this.completed = true;
          return 'path-complete';
        default: 
          return 'path-continue';
      }
    } else {
      this.pathPos = -1;
      return 'path-fail';
    }
  }
  completeness() {
    return this.pathPos / (this.path.length-1);
  }
}

Game.randomSized = function (lower, upper) {
  if (lower === undefined) {
    lower = 5;
    upper = 9;
  } else if (upper === undefined) {
    lower = lower - 1;
    upper = lower + 3;
  }
  const s = randomInteger(lower, upper);
  return new Game(s, s);
}

const DOM = {
  rootContainer: document.querySelector('#app'),
  gameField: document.querySelector('#game-field'),
};


const game = Game.randomSized().generatePath();
DOM.gameField.style.gridTemplateColumns = `repeat(${game.w}, 1fr)`;


const EventListeners = {
  onCellClick: (e) => {
    console.log('click', e.target);
    if (game.completed) {
      // restart game
      window.location.reload(false);
    }
  },
  onCellMouseMove: (e) => {
    const pos = +e.target.dataset.pos;
    const res = game.enterPosition(pos);

    if (res === undefined) {
      return;
    }

    DOM.applyCompleteness();

    if (res === 'path-start') {
      DOM.resetCells();
    }
    if (res === 'path-fail') {
      DOM.resetCells();
      return;
    }

    if (['path-start', 'path-continue'].includes(res)) {
      DOM.setCellOnPath(pos);
    } else if (res === 'path-complete') {
      DOM.setCellOnPath(pos);
      DOM.setCellsPathCompleted();
    }
  },
};


DOM.cells = game.map((_, i) => {
  const value = game[i];
  const cell = document.createElement('button');
  cell.classList.add('cell');
  cell.dataset.pos = i;
  cell.addEventListener('click', EventListeners.onCellClick);
  cell.addEventListener('mousemove', EventListeners.onCellMouseMove);
  cell.addEventListener('touchmove', EventListeners.onCellMouseMove);

  DOM.gameField.appendChild(cell);  

  return cell;
});


Object.assign(DOM, {
  resetCells: function () {
    this.cells.forEach(c => { c.dataset.onPath = false; });
  },
  setCellOnPath: function (pos) {
    this.cells[pos].dataset.onPath = true;
  },
  setCellsPathCompleted: function () {
    this.gameField.classList.add('path-completed');
  },
  applyCompleteness: function () {
    const completeness = game.completeness();
    if (completeness !== 1) {
      this.rootContainer.style.backgroundColor = `rgb(${0x44}, ${0x44 + completeness*0x66}, ${0x44})`;
    } else {
      this.rootContainer.style.backgroundColor = '#0000cc';
    }
  }
});
