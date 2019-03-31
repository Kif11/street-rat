import initWebScene from './HKAlley';
import TestScene from './TestScene';

const scene = 'test';

document.body.style.margin = '0';

switch (scene) {
  case 'main':
    initWebScene();
    break;
  case 'test': {
    const s = new TestScene();
    s.render();
    break;
  }
  default:
    initWebScene();
}
