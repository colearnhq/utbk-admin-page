import { PluginComponent } from "react-markdown-editor-lite";

class LatexBlock extends PluginComponent {
  static pluginName = "blockInline";

  static align = "left";

  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);

    this.handleKeyboard = {
      key: "l",
      keyCode: 76,
      withKey: ["ctrlKey"],
      callback: this.handleClick
    };
  }

  handleClick() {
    const selection = this.editor.getSelection();
    if (selection.text) {
      this.editor.insertText(`$$${selection.text}$$`, true);
    } else {
      this.editor.insertText("$$$$");
    }
  }

  componentDidMount() {
    if (this.editorConfig.shortcuts) {
      this.editor.onKeyboard(this.handleKeyboard);
    }
  }

  componentWillUnmount() {
    this.editor.offKeyboard(this.handleKeyboard);
  }

  render() {
    return (
      <span
        className="button button-type-font-underline"
        title="Block LaTeX"
        onClick={this.handleClick}>
        <strong>
          <u>Σ</u>
        </strong>
      </span>
    );
  }
}

export default LatexBlock;