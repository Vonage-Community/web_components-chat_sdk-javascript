import { html, css, LitElement } from 'lit';

export class VcTypingIndicator extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: var(--vc-typing-indicator-text-color, #000);
    }
  `;

  static properties = {
    client: { type: Object },
    conversationId: { type: String },
    typingStatus: { type: String },
  };

  constructor() {
    super();
    this.client = {};
    this.conversationId = undefined;
    this.typingStatus = '';
  }

  connectedCallback() {
    super.connectedCallback();
    if (!window.vonageClientSDK){
      console.error("Please load Vonage JavaScript Client SDK.");
    }
  }

  __handleConversationEvent(e) {
    if (this.conversationId === e.conversationId){
      const typingEvent = e.body;
      switch (typingEvent.type) {
        case 'typing:start':
          if (this.myId !== typingEvent.member.id) {
            this.typingStatus = `${typingEvent.member.displayName} is typing...`;
          }
          break;
        case 'typing:stop':
          this.typingStatus = '';
          break;
      }
    }
  }

  async updated(changedProperties) {
    if (changedProperties.get('client')) {
      try {
        const myMember = await this.client.getConversationMember(this.conversationId, 'me');
        this.myId = myMember.id; 
        this.client.on('conversationEvent', (event) => {
          if (event.kind === "ephemeral"){
            this.__handleConversationEvent(event);
          }
        });  
      } catch (error) {
        console.error("error getting Member information: ",error);
      }
    }
  }

  render() {
    return html` <p>${this.typingStatus}</p> `;
  }
}
