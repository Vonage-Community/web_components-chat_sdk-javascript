import { html, css, LitElement } from 'lit';

export class VcTextInput extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: var(--vc-text-input-text-color, #000);
    }
  `;

  static properties = {
    client: { type: Object },
    conversationId: { type: String },
    message: { type: String },
    placeholder: { type: String },
    buttonText: { type: String },
    typingTimeout: { type: Number },
  };

  constructor() {
    super();
    this.client = {};
    this.myMember = '';
    this.conversationId = "";
    this.message = "";
    this.placeholder = "Enter message";
    this.buttonText = "send";
    this.typingTimeout = 500;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!window.vonageClientSDK){
      console.error("Please load Vonage JavaScript Client SDK.");
    }
  }

  async __handleKeypress(e) {
    // start ephemeral event
    const startTypingEvent = {
      type: "typing:start",
      member: this.myMember
    };
    await this.client.sendEphemeralEvent(
      this.conversationId,
      startTypingEvent
    );

  }

  __handleKeyup(e) {
    this.message = e.target.value;
    let timeout = null;
    clearTimeout(timeout)
    timeout = setTimeout( async () => {
      // stop ephmeral event
      const stopTypingEvent = {
        type: "typing:stop",
        member: this.myMember
      };
      await this.client.sendEphemeralEvent(
        this.conversationId,
        stopTypingEvent
      );
    }, this.typingTimeout);
  }

  async __handleClickEvent() {
    if (this.message){
      try {
        await this.client.sendMessageTextEvent(this.conversationId, this.message);
        this.message = '';
      } catch (error) {
        console.error("error sending the message ", error);
      }
    }
  }

  async updated(changedProperties) {
    if (changedProperties.get('client') || changedProperties.get("conversationId")) {
      try {
        const myConvMember = await this.client.getConversationMember(this.conversationId, 'me');
        this.myMember = { id: myConvMember.id, username: myConvMember.user.name, displayName: myConvMember.user.displayName, userId: myConvMember.user.id};  
      } catch (error) {
        console.error("error getting Member information: ",error);
      }
    }
  }

  render() {
    return html`
      <input part="input" placeholder=${this.placeholder} .value="${this.message}" @keypress=${this.__handleKeypress} @keyup=${this.__handleKeyup} type="text" id="text" name="text">
      <button part="button" @click=${this.__handleClickEvent}>${this.buttonText}</button>
    `;
  }
}
