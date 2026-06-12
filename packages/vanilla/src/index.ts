import { generateUID } from '@omnipad/core/utils';

export class TestWidget {
  private el: HTMLElement;

  constructor(container: HTMLElement, label: string) {
    this.el = document.createElement('div');
    this.el.id = generateUID('test')
    this.el.innerText = `${label} (ID: ${this.el.id})`;
    Object.assign(this.el.style, {
      padding: '12px 20px',
      background: 'rgba(255, 186, 67, 0.1)',
      border: '2px solid #ffba43',
      color: '#ffba43',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      marginTop: '10px',
      display: 'inline-block'
    });
    container.appendChild(this.el);
    console.log('[Vanilla-Test] Widget mounted successfully.');
  }

  public destroy() {
    this.el.remove();
    console.log('[Vanilla-Test] Widget destroyed.');
  }
}