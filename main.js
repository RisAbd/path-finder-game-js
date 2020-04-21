

function choice(fromArray) {
  return fromArray[Math.floor(Math.random() * fromArray.length)];
}

function randomInteger(lowerInclusiveBound, upperExclusiveBound) {
  if (upperExclusiveBound === undefined) {
    upperExclusiveBound = lowerInclusiveBound;
    lowerInclusiveBound = 0;
  }
  return lowerInclusiveBound + Math.floor(Math.random() * (upperExclusiveBound - lowerInclusiveBound));
}

function randomCoordinate(fieldWidth, fieldHeight) {
  return [randomInteger(fieldWidth), randomInteger(fieldHeight)];
}

function adjacentCoordinates([x, y], fieldWidth, fieldHeight, exclude) {
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
  }
  generatePath(length) {
    if (length === undefined) {
      length = Math.floor(Math.random() * 5 + 7);  // [7..12)
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
    // console.log(path);
    path.forEach(([x, y], i) => {
      this[x+y*this.w] = i+1;
    });

    this.path = path;

    console.log('path generated in %s tries', triesCount);

    return this;
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
}

const DOM = {
  rootContainer: document.querySelector('#app'),
  gameField: document.querySelector('#game-field'),
};

const game = new Game(6, 6).generatePath();
DOM.gameField.style.gridTemplateColumns = `repeat(${6}, 1fr)`;



const EventListeners = {
  onCellClick: (e) => {
    console.log('click', e.target);
  },
  onCellMouseMove: (e) => {
    // console.log('mousemove', e.target.dataset.pos);
  },
};


DOM.cells = game.map((_, i) => {
  const value = game[i];
  const cell = document.createElement('button');
  cell.classList.add('cell');
  cell.dataset.pos = i;
  cell.addEventListener('click', EventListeners.onCellClick);
  cell.addEventListener('mousemove', EventListeners.onCellMouseMove);

  DOM.gameField.appendChild(cell);  

  return cell;
});

