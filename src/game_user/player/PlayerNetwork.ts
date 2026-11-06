import { PlayerSocket } from "../../game_common/network/Interfaces";
import { io } from "socket.io-client";
import { sendMatchResultToParent } from "./MatchResultBridge";
import type { ParentProfile } from "./ProfileBridge";

interface TransportEvents {
  open: () => void;
  close: (reason: string) => void;
  error: (error: Error) => void;
  connect_error: (error: Error) => void;
  reconnect_attempt: (attempt: number) => void;
  reconnect_error: (error: Error) => void;
  reconnect_failed: () => void;
  reconnect: (attempt: number) => void;
}

interface CallbackItem {
  event: keyof TransportEvents;
  callback: (...args: any[]) => void;
  bound: (...args: any[]) => void;
  context?: any;
  once: boolean;
}

export class PlayerNetwork {
  private static readonly playerTokenKey = "game-player-token";
  private static readonly frontendUsernameKey = "site-username";
  private readonly playerToken: string;
  private callbacks: Array<CallbackItem>;
  private profile: ParentProfile | null = null;
  sock: PlayerSocket;

  constructor()
  {
    this.playerToken = this.getPlayerToken();
    this.callbacks = new Array<CallbackItem>();
  }

  setProfile(profile: ParentProfile | null) {
    this.profile = profile;
  }

  connect(address: string) {
    this.disconnect();
    this.sock = io(address, {
      auth: {
        playerToken: this.playerToken,
        ...(this.profile && {
          userId: this.profile.id,
          username: this.profile.username})},
      reconnectionAttempts: 3
    });
    this.sock.io.reconnection(true);
    this.sock.on("connect_error", () => this.sock.io.reconnection(false));
    this.sock.on("matchResult", sendMatchResultToParent);
    this.callbacks.forEach((item: CallbackItem) => this.applyCallback(item));
  }

  disconnect()
  {
    if (this.sock) {
      this.sock.removeAllListeners();
      this.sock.io.removeAllListeners();
      this.sock.disconnect();
      this.sock = undefined as any;
    }
  }

  setCallback(event: keyof TransportEvents, callback: (...args: any[]) => void, context?: any, once?: boolean)
  {
    if (this.callbacks.some((item) =>
        item.event === event &&
        item.callback === callback &&
        item.context === context))
      return;
    const bound = context ? callback.bind(context) : callback;
    const item: CallbackItem = {event, callback, bound, context, once: once ?? false};
    this.callbacks.push(item);
    if (this.sock)
      this.applyCallback(item);
  }

  removeCallback(event: keyof TransportEvents, callback: (...args: any[]) => void, context?: any)
  {
    const matches = this.callbacks.filter((item) =>
      item.event === event &&
      item.callback === callback &&
      item.context === context);
    if (this.sock)
      matches.forEach((item) => this.sock.io.off(event as any, item.bound));
    this.callbacks = this.callbacks.filter((item) =>
      !(item.event === event &&
        item.callback === callback &&
        item.context === context
      ));
  }

  private applyCallback(item: CallbackItem)
  {
    if (item.once)
      this.sock.io.once(item.event as any, item.bound);
    else
      this.sock.io.on(item.event as any, item.bound);
  }

  private getPlayerToken(): string {
    const nicknameFromQuery = new URLSearchParams(window.location.search).get("nickname")?.trim();
    if (nicknameFromQuery)
    {
      window.localStorage.setItem(PlayerNetwork.playerTokenKey, nicknameFromQuery);
      return nicknameFromQuery;
    }

    const frontendUsername = window.localStorage.getItem(PlayerNetwork.frontendUsernameKey)?.trim();
    if (frontendUsername)
    {
      window.localStorage.setItem(PlayerNetwork.playerTokenKey, frontendUsername);
      return frontendUsername;
    }

    const storedToken = window.localStorage.getItem(PlayerNetwork.playerTokenKey);
    if (storedToken)
      return storedToken;
    const token = this.generateUUID();
    window.localStorage.setItem(PlayerNetwork.playerTokenKey, token);
    return token;
  }

  private generateUUID(): string
  {
    if (typeof globalThis.crypto?.randomUUID === "function")
      return globalThis.crypto.randomUUID();
    if (typeof globalThis.crypto?.getRandomValues === "function")
    {
      return ("" + 1e7 + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) =>
        (c ^ (globalThis.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      );
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
