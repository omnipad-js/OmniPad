import { 
  VirtualTrackpad, 
  type ButtonRenderContext, 
  type ConfigTreeNode, 
  type LayoutBox 
} from '@omnipad/vanilla';

// 声明我们自定义组件接收的参数类型
interface CustomTrackpadOptions {
  treeNode?: ConfigTreeNode;
  widgetId?: string;
  label?: string;
  sensitivity?: number;
  targetStageId?: string;
  layout?: LayoutBox;
}

/**
 * Custom-styled Trackpad using vanilla DOM generation.
 * Replicates the Vue slot override behavior via functional RenderElements.
 */
export class CustomTrackpad extends VirtualTrackpad {
  constructor(container: HTMLElement, options: CustomTrackpadOptions = {}) {
    // 核心：利用我们设计的 RenderElement 机制，平替 Vue 的 #base 和默认插槽
    const customOptions = {
      ...options,
      
      // 1. [平替 #base slot] 重写底座
      renderBase: (ctx: ButtonRenderContext) => {
        const glowBox = document.createElement('div');
        glowBox.className = 'glow-box';
        if (ctx.isActive) {
          glowBox.classList.add('is-active');
        }

        const scanLine = document.createElement('div');
        scanLine.className = 'scan-line';
        glowBox.appendChild(scanLine);

        return glowBox;
      },

      // 2. [平替 default slot] 重写文本内容
      renderContent: (ctx: ButtonRenderContext) => {
        const labelSpan = document.createElement('span');
        labelSpan.className = 'custom-label';
        labelSpan.innerText = ctx.label || 'TRACKPAD';
        return labelSpan;
      }
    };

    // 运行父类构造，完成装配
    super(container, customOptions);

    // 注入自定义的主题样式类名
    this.el.classList.add('fancy-tp');
  }
}

// 确保默认导出符合组件注册规范
export default CustomTrackpad;