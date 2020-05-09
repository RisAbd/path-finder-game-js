
function assert(condition, message = 'Assertion Error') {
  if (!condition) {
    throw new Error(message);
  }
}


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

function randomColor(opacity = false) {
  const rnd = () => randomInteger(0, 256);
  const r = `rgb(${rnd()}, ${rnd()}, ${rnd()})`;
  if (opacity) {
    opacity = opacity === true ? rnd() : opacity;
    return r.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
  }
  return r;
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

    this.paths = [];
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
  generatePaths(length) {
    if (length === undefined) {
      length = randomInteger(8, 15);
    }
    assert(length < this.w*this.h*0.75, `path length (${length}) too long for this field: ${this.w}x${this.h}`);

    const pathsCount = 2;

    this.paths = new Array(2).fill(0);

    this.paths.forEach((_, pathIndex, arr) => {

      // all previous paths coordinates are untouchable
      const prevPathCoords = arr.slice(0, pathIndex).reduce((a, b) => a.concat(b), []);
      // console.log(prevPathCoords);

      // only first cells of previous path coordinates are untouchable
      const prevPathHeadCoords = arr.slice(0, pathIndex).reduce((a, b) => {a.push(b[0]); return a;}, []);

      let path = Object.assign([], {
        pos: -1, 
        _generateTriesCount: 0, 
        id: pathIndex+1, 
        triesCount: 0, 
        completed: false,
        completeness: function () {
          return this.pos / (this.length - 1);
        }
      });
      // path can find its deadend so we need to loop until successful path is generated
      while (path.length < length) {
        path._generateTriesCount += 1;

        // select first random position on field
        let coordinate;
        do {
          coordinate = randomCoordinate(this.w, this.h);
          // that does not clash with other's coordinates
        } while (prevPathCoords.some(([x2, y2]) => coordinate[0] === x2 && coordinate[1] === y2));

        // clear path and add first coordinate
        path.splice(0, path.length, coordinate);

        for (let i = 1; i < length; i++) {
          const excludeCoords = path.concat(prevPathHeadCoords);
          // neighbors of last position excluding all that are already part of path
          const neighbors = adjacentCoordinates(coordinate, this.w, this.h, excludeCoords);

          if (neighbors.length === 0) {
            // dead end, no free neighbors left, start again
            break
          }
          coordinate = choice(neighbors);
          path.push(coordinate);
        };
      }
      // console.log('path generated in %s tries', path._generateTriesCount);

      arr[pathIndex] = path;
    });

    this.paths.forEach(path => {
      // do we need whole this model as array?
      path.forEach(([x, y], i) => { 
        const fp = x+y*this.w;
        path[i] = fp; 
        this[fp] = i+1; 
      });
    });

    return this;
  }
  enterPosition(pos) {
    if (pos === this.prevPos || this.completed) {
      return;
    }
    this.prevPos = pos;

    const onGoingPaths = this.paths.map(path => {
      if (path.completed) {
        return [path, undefined];
      }
      if (path[path.pos+1] === pos) {
        path.pos += 1;

        switch (path.pos) {
          case 0: 
            return [path, 'path-start'];
          case path.length-1: 
            path.completed = true;
            return [path, 'path-complete'];
          default: 
            return [path, 'path-continue'];
        }
      } else if (path.pos > -1) {
        path.pos = -1;
        path.triesCount += 1;
        return [path, 'path-fail'];
      } else {
        return [path, undefined]
      }
    }).filter(([p, res]) => res !== undefined);

    // todo: rework! 
    // assert([1, 0].includes(onGoingPaths.length), 'something went wrong!');

    if (onGoingPaths.length > 0) {
      return onGoingPaths.map(([p, r]) => p); 
    }
  }
  completeness() {
    return this.paths.map(p => p.completeness()).reduce((a, b) => a > b ? a : b, 0);
  }
}

Game.randomSized = function (lower, upper) {
  if (lower === undefined) {
    lower = 6;
    upper = 10;
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


const game = Game.randomSized(5,6).generatePaths();
DOM.gameField.style.gridTemplateColumns = `repeat(${game.w}, 1fr)`;


const EventListeners = {
  onCellClick: (e) => {
    console.log('click', e.target);
    // if (game.completeness() === 1) {
    //   // restart game
    //   window.location.reload(false);
    // }
  },
  onCellMouseMove: (e) => {
    e.target.focus();
  },
  onCellFocus: (e) => {
    const pos = +e.target.dataset.pos;
    const enterResult = game.enterPosition(pos);

    if (enterResult === undefined) {
      return;
    }

    enterResult.forEach(DOM.applyPath.bind(DOM));
  },
  onKeyDown: (e) => {
    const currentPos = document.activeElement && +document.activeElement.dataset.pos || 0;
    let targetPos = currentPos;
    switch (e.keyCode) {
      case 38: // up
        if (currentPos >= game.w) {
          targetPos -= game.w;
        }
        break;
      case 39: // right
        if (currentPos % game.w < game.w-1) {
          targetPos += 1;
        }
        break;
      case 40: // down
        if (currentPos < game.length - game.w) {
          targetPos += game.w;
        }
        break;
      case 37: // left
        if (currentPos % game.w > 0) {
          targetPos += -1;
        }
        break;
    }
    if (targetPos !== currentPos) {
      DOM.cells[targetPos].focus();
    }
  },
};

document.addEventListener('keydown', EventListeners.onKeyDown);


DOM.cells = game.map((_, i) => {
  const cell = document.createElement('div');
  cell.tabIndex = 0;
  cell.classList.add('cell');
  cell.dataset.pos = i;
  cell.addEventListener('focus', EventListeners.onCellFocus);
  cell.addEventListener('click', EventListeners.onCellClick);
  cell.addEventListener('mousemove', EventListeners.onCellMouseMove);

  DOM.gameField.appendChild(cell);  

  return cell;
});



const colors = ['purple', 'orange'];


Object.assign(DOM, {

  _createPathCell(path) {
    const el = document.createElement('div');
    el.classList.add('path-cell');
    el.dataset.pathId = path.id;
    el.style.backgroundColor = path._color;
    return el;
  },
  applyPath(path) {
    // todo:
    if (!path._color) {
      path._color = randomColor(); //colors[path.id-1];
    }

    const completeness = path.completeness();
    if (completeness !== 1) {
      this.rootContainer.style.backgroundColor = `rgb(${0x44}, ${0x44 + completeness*0x66}, ${0x44})`;
    } else {
      this.rootContainer.style.backgroundColor = '#0000cc';
    }

    for (let i = 0; i < path.length; i++) {
      const pos = path[i];
      const cell = this.cells[pos];
      // if (i === 0) {
      //   // todo: remove on 'path-fail'
      //   cell.innerText = path.triesCount;
      // }
      if (i > path.pos) {
        cell.querySelectorAll(`.path-cell[data-path-id="${path.id}"]`).forEach(e => e.remove());
      } else {
        // todo: maybe .path-cell is already exists?
        const pathCell = cell.querySelector(`.path-cell[data-path-id="${path.id}"]`) || this._createPathCell(path);
        if (i === 0) {
          pathCell.innerText = path.triesCount;
        } else {
          // '⇠⇡⇢⇣'
          // '⬅⬆➡⬇'
          // '←↑→↓'
          const posDiff = pos - path[i-1];
          if (posDiff === 1) {
            pathCell.innerText = '→';
            pathCell.classList.add('arrow-right');
            pathCell.classList.add('arrow');
          } else if (posDiff === -1) { 
            pathCell.innerText = '←';
            pathCell.classList.add('arrow-left');
            pathCell.classList.add('arrow');
          } else if (posDiff > 0) { 
            pathCell.innerText = '↓';
            pathCell.classList.add('arrow-down');
            pathCell.classList.add('arrow');
          } else if (posDiff < 0) { 
            pathCell.innerText = '↑';
            pathCell.classList.add('arrow-up');
            pathCell.classList.add('arrow');
          }
        }
        pathCell.dataset.pathCompleted = completeness === 1;
        cell.appendChild(pathCell);
      }
  
    }
  },
});
