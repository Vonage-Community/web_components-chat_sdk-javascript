import { html, css, LitElement } from 'lit';

export class VcMembers extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: var(--vc-members-text-color, #000);
    }
    li:nth-child(odd) {
      background-color: var(--vc-members-nth-child-odd-color, Field);
    }
    li:nth-child(even) {
      background-color: var(--vc-members-nth-child-even-color, AccentColor);
    }
  `;

  static properties = {
    client: { type: Object },
    conversationId: { type: String },
    members: { type: Array },
  };

  constructor() {
    super();
    this.client = {};
    this.conversationId = undefined;
    this.members = [];
  }

  connectedCallback() {
    super.connectedCallback();
    if (!window.vonageClientSDK){
      console.error("Please load Vonage JavaScript Client SDK.");
    }
  }

  __handleConversationEvent(e) {
    if (this.conversationId === e.conversationId){
      switch (e.kind) {
        case 'member:joined':
          this.members = [...this.members, { displayName: e.body.user.displayName, memberId: e.body.memberId, userName: e.body.user.name, userId: e.body.user.id}];
          break;
        case 'member:left':
          this.members = this.members.filter(member => member.memberId !== e.body.memberId);
          break;
      }
    }
  }

  async updated(changedProperties) {
    if(changedProperties.get("client") || changedProperties.get("conversationId")){
      console.log("changed properties: ",changedProperties);
      try {
        if (changedProperties.get("conversationId")){
          this.members = [];
        }
        const { members, nextCursor, previousCursor } =
          await this.client.getConversationMembers(this.conversationId, {
            order: 'asc',
            pageSize: 100
          });
        members.forEach((member, key, map) => {
          if (member.state === "JOINED") {
            this.members = [...this.members, { displayName: member.user.displayName, memberId: member.id, userName: member.user.name, userId: member.user.id}];
          }
        })

        this.client.on('conversationEvent', (event) => {
          this.__handleConversationEvent(event);
        });
      }
      catch (error){
        console.error('error in getting members of the conversation: ', error);
      }
    }
  }

  render() {
    return html`
      <ul part="ul">
        ${this.members.map((member) => html`<li part="li">${member.displayName}</li>`)}
      </ul>
    `;
  }
}
