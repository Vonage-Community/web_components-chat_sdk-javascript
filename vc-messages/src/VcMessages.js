import { html, css, LitElement } from 'lit';

export class VcMessages extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: var(--vc-messages-text-color, #000);
    }
    #messages-container {
      width: 100%;
      height: 100%;
      overflow-y: auto;
    }
    img {
      width: 100%;
    }
  `;

  static properties = {
    client: { type: Object },
    conversationId: { type: String },
    messages: { type: Array },
    loadPreviousMessages: { type: String },
    filter: { type: Array },
};

  constructor() {
    super();
    this.client = {};
    this.conversationId = undefined;
    this.messages = [];
    this.loadPreviousMessages = undefined;
    this.filter = ['message','member:joined','member:left','member:invited'];
    this.myId = '';
    this.messageFeed = {};
    this.feedAtBottom = false;
    this.eventListener;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!window.vonageClientSDK){
      console.error("Please load Vonage JavaScript Client SDK.");
    }
  }

  isFeedAtBottom() {
    return (
      this.messageFeed.offsetHeight + this.messageFeed.scrollTop ===
      this.messageFeed.scrollHeight
    );
  }

  scrollFeedToBottom() {
    this.messageFeed.scrollTop = this.messageFeed.scrollHeight;
  }

  __handleConversationEvent(e) {
    let message;
    let sender;
    const isMessageText = e.kind.split(':')[0] === 'message';
    const isInFilter = this.filter.join(' ').includes(isMessageText ? 'message' : e.kind);
    if (this.conversationId === e.conversationId && isInFilter){
      switch (e.kind) {
        case 'member:invited':
          sender = {
                displayName: e.body.user.displayName,
                memberId: e.body.memberId,
                userName: e.body.user.name,
                userId: e.body.user.id,
                kind: e.from.kind
          };
          message = `${e.body.user.displayName} was invited.`;
          this.messages = [...this.messages, { sender, message }];
          break;
        case 'member:joined':
          sender = {
                displayName: e.body.user.displayName,
                memberId: e.body.memberId,
                userName: e.body.user.name,
                userId: e.body.user.id,
                kind: e.from.kind
          };
          message = `${e.body.user.displayName} joined.`;
          this.messages = [...this.messages, { sender, message }];
          break;
        case 'member:left':
          sender = {
                displayName: e.body.user.displayName,
                memberId: e.body.memberId,
                userName: e.body.user.name,
                userId: e.body.user.id,
                kind: e.from.kind
          };
          message = `${e.body.user.displayName} left.`;
          this.messages = [...this.messages, { sender, message }];
          break;
        case 'message:text':
          sender = {
            displayName: e.from.user.displayName,
            memberId: e.from.memberId,
            userName: e.from.user.name,
            userId: e.from.user.id,
            kind: e.from.kind
          };
          message =  e.body.text;
          this.messages = [...this.messages, { sender, message }];
          break;
        case 'message:image':
          sender = {
            displayName: e.from.user.displayName,
            memberId: e.from.memberId,
            userName: e.from.user.name,
            userId: e.from.user.id,
            kind: e.kind
          };
          message = e.body.imageUrl;
          this.messages = [...this.messages, { sender, message }];
          break;
      }
      this.feedAtBottom = this.isFeedAtBottom();
    }
  }

  async updated(changedProperties) {
    try {
      this.messageFeed = this.shadowRoot.querySelector('#messages-container');
      if (changedProperties.get('client') || changedProperties.get("conversationId")) {
        if (changedProperties.get("conversationId")){
          this.messages = [];
          this.client.off('conversationEvent', this.eventListener);
        }
        const myMember = await this.client.getConversationMember(this.conversationId, 'me');
        this.myId = myMember.id;
        this.eventListener = this.client.on('conversationEvent', (event) => {
          this.__handleConversationEvent(event);
        });
        // if loadPreviousMessages
        if (this.loadPreviousMessages !== undefined){
          let loadAllMessages = false;
          let limit;
          if (this.loadPreviousMessages.toLowerCase() === "all"){
            loadAllMessages = true;
            limit = 100;
          } else {
            limit = Number(this.loadPreviousMessages) ? Number(this.loadPreviousMessages) : 100 ;
          }
          const params = {
            order: 'desc',
            pageSize: limit > 100 ? 100 : limit,
            cursor: undefined,
            eventFilter: this.filter, // event filter query
            includeDeletedEvents: false,
          }
          const { events, nextCursor, previousCursor } = await this.client.getConversationEvents(this.conversationId, params);
          let totalEvents = [...events];
          let currentCursor = nextCursor;
          while ((currentCursor && totalEvents.length < limit) || (currentCursor && loadAllMessages)) {
            let eventsNeeded 
            if (loadAllMessages){
              eventsNeeded = 100;
            } else {
              eventsNeeded = limit - totalEvents.length;
            }
            const params = {
              order: 'desc',
              pageSize: eventsNeeded > 100 ? 100 : eventsNeeded,
              cursor: currentCursor,
              eventFilter: this.filter, // event filter query
              includeDeletedEvents: false,
            }
            const { events, nextCursor, previousCursor } = await this.client.getConversationEvents(this.conversationId, params);
            totalEvents = [...events , ...totalEvents];
            currentCursor = nextCursor;
          }
          for (let i = totalEvents.length - 1; i >= 0; i--){
            this.__handleConversationEvent(totalEvents[i]);
          }
        }
      }
    } catch(e){
      console.error("error: ", e)
    }
    if (this.feedAtBottom) {
      const messageElems = this.shadowRoot.querySelectorAll('.message');
      if (messageElems[this.messages.length - 1]){
        messageElems[this.messages.length - 1].scrollIntoView();
      }
    }
  }

  render() {
    return html`
      <div id="messages-container">
        ${this.messages.map(
          messageObject => html`
            ${this.myId === messageObject.sender.memberId
              ? html`<div class="message mine" part="message mine">
                ${messageObject.sender.kind === 'message:image' ? html`<div class="message-image mine" part="message-image mine"><img class="image mine" part="image mine" src="${messageObject.message}" /></div>`: html`<div class="message-text mine" part="message-text mine">${messageObject.message.replace(/</g, '&lt;')}</div>`}
                ${messageObject.sender.kind !== 'system' ? html`<div class="username mine" part="username mine">${messageObject.sender.displayName.replace(/</g, '&lt;')}</div>` : ''}
              </div>`
              : html`<div class="message" part="message">
                  ${messageObject.sender.kind === 'message:image' ? html`<div class="message-image" part="message-image"><img class="image" part="image" src="${messageObject.message}" /></div>` : html`<div class="message-text" part="message-text">${messageObject.message.replace(/</g, '&lt;')}</div>`}
                  ${messageObject.sender.kind !== 'system' ? html`<div class="username" part="username">${messageObject.sender.displayName.replace(/</g, '&lt;')}</div>` : ''}
                </div>`}
          `
        )}
      </div>
    `;
  }
}
