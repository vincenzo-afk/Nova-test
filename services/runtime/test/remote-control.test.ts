import { describe, expect, it, vi } from "vitest";
import {
  RemoteControlManager,
  type RemoteCommand,
  type RemoteTransport,
} from "../src/remote-control.js";

describe("RemoteControlManager", () => {
  it("requires signed session approval and routes commands through an explicit session", async () => {
    const transport: RemoteTransport = {
      verify: vi.fn(() => true),
      send: vi.fn(async () => undefined),
    };
    const manager = new RemoteControlManager(transport, { now: () => 1000, sessionTtlMs: 5000 });

    const session = manager.requestSession({
      session_id: "session-1",
      initiator_device_id: "phone",
      signature: "sig",
    });
    expect(session).toMatchObject({ ok: true, value: { state: "AwaitingApproval" } });
    expect(manager.approve("session-1")).toMatchObject({ ok: true, value: { state: "Active" } });
    const command: RemoteCommand = {
      command_id: "cmd-1",
      content: "show tasks",
      destructive: false,
    };
    expect(await manager.execute("session-1", command)).toMatchObject({
      ok: true,
      value: { command_id: "cmd-1", audit_origin: "remote" },
    });
    expect(transport.send).toHaveBeenCalledWith("session-1", command);
  });

  it("supports scoped pre-approval but still expires and revokes immediately", async () => {
    let now = 1000;
    const manager = new RemoteControlManager(
      { verify: () => true, send: async () => undefined },
      { now: () => now, sessionTtlMs: 5000 },
    );
    manager.preApprove("phone", 2000);
    expect(
      manager.requestSession({
        session_id: "session-2",
        initiator_device_id: "phone",
        signature: "sig",
      }),
    ).toMatchObject({ ok: true, value: { state: "Active" } });
    manager.revoke("phone");
    expect(
      await manager.execute("session-2", {
        command_id: "cmd-2",
        content: "list",
        destructive: false,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });

    now = 4000;
    expect(
      manager.requestSession({
        session_id: "session-3",
        initiator_device_id: "phone",
        signature: "sig",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
  });

  it("rejects invalid session TTL configuration before creating a session", () => {
    for (const sessionTtlMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      const manager = new RemoteControlManager(
        { verify: () => true, send: async () => undefined },
        { sessionTtlMs },
      );
      expect(
        manager.requestSession({
          session_id: "session",
          initiator_device_id: "phone",
          signature: "sig",
        }),
      ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    }
  });

  it("rejects blank session and command fields before remote work", async () => {
    const manager = new RemoteControlManager({
      verify: () => true,
      send: async () => undefined,
    });

    expect(
      manager.requestSession({ session_id: "", initiator_device_id: "phone", signature: "sig" }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(
      manager.requestSession({ session_id: "session", initiator_device_id: "", signature: "sig" }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(
      manager.requestSession({
        session_id: "session",
        initiator_device_id: "phone",
        signature: " ",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });

    const valid = manager.requestSession({
      session_id: "session",
      initiator_device_id: "phone",
      signature: "sig",
    });
    expect(valid).toMatchObject({ ok: true, value: { state: "AwaitingApproval" } });
    manager.approve("session");
    expect(
      await manager.execute("session", { command_id: "", content: "list", destructive: false }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(
      await manager.execute("session", { command_id: "command", content: " ", destructive: false }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
  });

  it("rejects unsigned requests, destructive commands without confirmation, and expired sessions", async () => {
    let now = 1000;
    const manager = new RemoteControlManager(
      { verify: () => false, send: async () => undefined },
      { now: () => now, sessionTtlMs: 1000 },
    );
    expect(
      manager.requestSession({ session_id: "bad", initiator_device_id: "phone", signature: "bad" }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    now = 1000;
    const valid = new RemoteControlManager(
      { verify: () => true, send: async () => undefined },
      { now: () => now, sessionTtlMs: 1000 },
    );
    valid.requestSession({
      session_id: "session-4",
      initiator_device_id: "phone",
      signature: "sig",
    });
    valid.approve("session-4");
    expect(
      await valid.execute("session-4", {
        command_id: "cmd-4",
        content: "delete",
        destructive: true,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    now = 2001;
    expect(
      await valid.execute("session-4", {
        command_id: "cmd-5",
        content: "list",
        destructive: false,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
  });
});
