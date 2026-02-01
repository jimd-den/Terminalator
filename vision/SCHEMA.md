# Setting & Mission Schema (The Standard)

To scale to thousands of scenarios, we define a strict schema. Each "Setting" is a JSON object that the `WorldBuilder` can digest.

## 1. The Setting Schema (`setting.json`)
```json
{
  "id": "SUBMARINE_001",
  "name": "Deep Pressure",
  "character": {
    "name": "Operator",
    "career": "Comms Officer",
    "skills": {
      "TECH": "d10",
      "SOCIAL": "d6",
      "STEALTH": "d8"
    },
    "stability": 100
  },
  "metadata": {
    "tags": ["nautical", "stealth", "high-stakes"],
    "difficulty": 4
  },
  "filesystem": {
    "root": {
      "bin": ["scheme", "sh", "grep"],
      "var/log/sonar": "Entry 1: Sounding normal\nEntry 2: ANOMALY-77 detected",
      "home/operator/scripts/validate.scm": "(define (check-x) ...)"
    }
  },
  "social": {
    "archetypes": [
      {
        "role": "ENGINEER",
        "description": "Technical, protective of their scripts.",
        "base_trust": 50,
        "triggers": {
          "positive": ["FIX_PIPE", "SAVE_LOG"],
          "negative": ["RM_SCRIPT", "SSH_UNAUTHORIZED"]
        }
      }
    ]
  },
  "laws": {
    "urgency": "PRESSURE_INCREASE",
    "mistake_consequence": "GLITCH_NOISE",
    "resource_limit": { "ram": 512, "disk": 1024 }
  }
}
```

---

## 2. The Task Schema (`mission.json`)
Tasks are validated using **Real Code Execution**.

```json
{
  "id": "MISSION_WHALE",
  "objective": "Identify the acoustic signature using a Scheme script.",
  "validation": {
    "type": "SCHEME_EXECUTION",
    "script": "/home/operator/scripts/analyzer.scm",
    "expected_output": "SIG_DELTA_9",
    "required_functions": ["analyze-wave"]
  },
  "urgency": {
    "type": "TRACE",
    "duration_seconds": 300,
    "on_expire": "SYSTEM_LOCKDOWN"
  }
}
```

---

## 3. Urgency Mechanics (The "Panic" Factor)

| Mechanic | Description | Technical Implementation |
| :--- | :--- | :--- |
| **The Trace** | A countdown timer on the HUD. | `setTimeout` linked to a `ProcessContext` signal. |
| **Process Hunter** | A hostile process (PID) that actively deletes files. | A background `Job` that runs a recursive `rm` script. |
| **Resource Drain** | Your available RAM or Disk space shrinks over time. | `FileSystem` limits that decrease every 60s. |
| **Visual Decay** | Terminal font size increases or colors shift to red. | CSS injection via `TerminalViewModel` emotion states. |

---

## 4. Real Shell Integration
Missions can require:
1.  **Function Definition**: "Write a shell function `mkbkp` that copies `$1` to `/backup/`."
    *   *Validation*: Run `sh` and check if `mkbkp` exists in the environment.
2.  **Scheme Compiling**: "Compile `engine.scm` and ensure it outputs a specific hash."
    *   *Validation*: Invoke the `scheme` command and diff the output.
