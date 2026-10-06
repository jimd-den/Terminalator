/**
 * OutputInterpreter.test.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Unit Tests for the Sensory Output Interpreter
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe } from "bun:test";
import { OutputInterpreter } from "../src/domain/interpreters/tutor/OutputInterpreter";
import { KnowledgeType } from "../src/domain/entities/knowledge/KnowledgeEntity";

describe("OutputInterpreter", () => {
    const interpreter = new OutputInterpreter();

    test("should parse ls output for paths", () => {
        const output = `total 8
-rw-r--r-- 1 root root  12 Feb 14 12:00 secret.txt
-rw-r--r-- 1 root root 456 Feb 14 12:00 info.log`;
        const entities = interpreter.interpret("ls -la", output);
        
        expect(entities).toHaveLength(2);
        expect(entities[0].value).toBe("secret.txt");
        expect(entities[1].value).toBe("info.log");
        expect(entities.every(e => e.type === KnowledgeType.PATH)).toBe(true);
    });

    test("should parse ifconfig output for IPs", () => {
        const output = `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 10.0.2.15  netmask 255.255.255.0  broadcast 10.0.2.255`;
        const entities = interpreter.interpret("ifconfig", output);

        expect(entities).toHaveLength(1);
        expect(entities[0].value).toBe("10.0.2.15");
        expect(entities[0].type).toBe(KnowledgeType.IP);
    });

    test("should parse whoami output for USER", () => {
        const entities = interpreter.interpret("whoami", "operator\n");
        expect(entities).toHaveLength(1);
        expect(entities[0].value).toBe("operator");
        expect(entities[0].type).toBe(KnowledgeType.USER);
    });

    test("should parse ps output for PIDs", () => {
        const output = `  PID TTY          TIME CMD
  101 pts/0    00:00:01 sh
  202 pts/0    00:00:00 ps`;
        const entities = interpreter.interpret("ps", output);

        expect(entities).toHaveLength(2);
        expect(entities[0].value).toBe("101");
        expect(entities[1].value).toBe("202");
        expect(entities.every(e => e.type === KnowledgeType.PID)).toBe(true);
    });
});
