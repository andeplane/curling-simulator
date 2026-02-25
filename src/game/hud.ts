import type { GameController } from "./game-controller";
import type { InputHandler } from "./input-handler";

export class HUD {
  private container: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private turnInfoEl: HTMLDivElement;
  private powerBarEl: HTMLDivElement;
  private powerFillEl: HTMLDivElement;
  private sweepIndicator: HTMLDivElement;
  private messageEl: HTMLDivElement;
  private controlsEl: HTMLDivElement;

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "hud";
    Object.assign(this.container.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#fff",
      zIndex: "10",
    });

    this.scoreEl = this.makeEl("score", {
      position: "absolute",
      top: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: "24px",
      fontSize: "18px",
      background: "rgba(0,0,0,0.6)",
      padding: "10px 24px",
      borderRadius: "8px",
      backdropFilter: "blur(4px)",
    });

    this.turnInfoEl = this.makeEl("turnInfo", {
      position: "absolute",
      top: "70px",
      left: "50%",
      transform: "translateX(-50%)",
      fontSize: "14px",
      background: "rgba(0,0,0,0.5)",
      padding: "6px 16px",
      borderRadius: "6px",
      textAlign: "center",
    });

    this.powerBarEl = this.makeEl("powerBar", {
      position: "absolute",
      bottom: "80px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "200px",
      height: "12px",
      background: "rgba(255,255,255,0.15)",
      borderRadius: "6px",
      overflow: "hidden",
    });
    this.powerFillEl = document.createElement("div");
    Object.assign(this.powerFillEl.style, {
      width: "0%",
      height: "100%",
      background: "linear-gradient(90deg, #00cc66, #ffcc00, #ff3333)",
      borderRadius: "6px",
      transition: "width 0.05s",
    });
    this.powerBarEl.appendChild(this.powerFillEl);

    this.sweepIndicator = this.makeEl("sweep", {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      fontSize: "28px",
      fontWeight: "bold",
      color: "#00ff88",
      textShadow: "0 0 20px rgba(0,255,136,0.5)",
      opacity: "0",
      transition: "opacity 0.15s",
    });
    this.sweepIndicator.textContent = "SWEEPING!";

    this.messageEl = this.makeEl("message", {
      position: "absolute",
      top: "45%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      fontSize: "24px",
      fontWeight: "bold",
      textAlign: "center",
      background: "rgba(0,0,0,0.7)",
      padding: "16px 32px",
      borderRadius: "10px",
      opacity: "0",
      transition: "opacity 0.3s",
    });

    this.controlsEl = this.makeEl("controls", {
      position: "absolute",
      bottom: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      fontSize: "12px",
      color: "rgba(255,255,255,0.5)",
      textAlign: "center",
    });
    this.controlsEl.innerHTML =
      "<b>A/D</b> aim &nbsp; <b>W/S</b> power &nbsp; <b>Q/E</b> spin (CCW/CW) &nbsp; <b>SPACE</b> throw/sweep &nbsp; <b>R</b> restart &nbsp; | &nbsp; Mouse = camera";

    document.body.appendChild(this.container);
  }

  private makeEl(
    id: string,
    styles: Partial<CSSStyleDeclaration>
  ): HTMLDivElement {
    const el = document.createElement("div");
    el.id = `hud-${id}`;
    Object.assign(el.style, styles);
    this.container.appendChild(el);
    return el;
  }

  update(game: GameController, input: InputHandler): void {
    // Score
    const remaining = game.stonesRemaining;
    this.scoreEl.innerHTML = `
      <span style="color:#ff4455">RED ${game.totalScore.red}</span>
      <span style="color:#aaa">End ${game.currentEnd}</span>
      <span style="color:#ffcc00">YELLOW ${game.totalScore.yellow}</span>
    `;

    const teamColor = game.currentTeam === "red" ? "#ff4455" : "#ffcc00";
    const teamName = game.currentTeam.toUpperCase();

    const angleDeg = (input.aimAngle * 180 / Math.PI).toFixed(1);
    const timeVal = input.aimTime.toFixed(1);
    const spinLabel = input.aimOmega > 0.05 ? "CW" : input.aimOmega < -0.05 ? "CCW" : "none";
    const spinVal = Math.abs(input.aimOmega).toFixed(1);

    if (game.phase === "AIMING") {
      this.turnInfoEl.innerHTML = `
        <span style="color:${teamColor}">${teamName}</span> to throw
        &nbsp;|&nbsp; Aim: ${angleDeg}&deg;
        &nbsp;|&nbsp; Speed: ${timeVal}s
        &nbsp;|&nbsp; Spin: <span style="color:#ffaa00">${spinVal} ${spinLabel}</span>
        &nbsp;|&nbsp; R:${remaining.red} Y:${remaining.yellow}
      `;
      this.turnInfoEl.style.opacity = "1";
    } else if (game.phase === "DELIVERING") {
      this.turnInfoEl.innerHTML = `Hold <b>SPACE</b> to sweep`;
      this.turnInfoEl.style.opacity = "1";
    } else {
      this.turnInfoEl.style.opacity = "0.5";
    }

    // Speed bar — normalized from 8s (0%) to 20s (100%)
    if (game.phase === "AIMING") {
      const timePct = ((input.aimTime - 8.0) / (20.0 - 8.0)) * 100;
      this.powerBarEl.style.opacity = "1";
      this.powerFillEl.style.width = `${Math.max(0, Math.min(100, timePct))}%`;
    } else {
      this.powerBarEl.style.opacity = "0";
    }

    // Sweep indicator
    this.sweepIndicator.style.opacity =
      game.phase === "DELIVERING" && game.world.sweeping ? "1" : "0";

    // Messages
    if (game.phase === "END_SCORE") {
      const lastScore = game.scoreHistory[game.scoreHistory.length - 1];
      const who = lastScore.red > 0 ? "RED" : lastScore.yellow > 0 ? "YELLOW" : "No one";
      const pts = Math.max(lastScore.red, lastScore.yellow);
      this.messageEl.innerHTML = pts > 0
        ? `End ${game.currentEnd} complete<br>${who} scores ${pts}!`
        : `End ${game.currentEnd} complete<br>Blank end!`;
      this.messageEl.style.opacity = "1";
    } else if (game.phase === "GAME_OVER") {
      const winner =
        game.totalScore.red > game.totalScore.yellow
          ? "RED"
          : game.totalScore.yellow > game.totalScore.red
            ? "YELLOW"
            : "TIE";
      this.messageEl.innerHTML = `Game Over!<br>${winner} wins ${game.totalScore.red}-${game.totalScore.yellow}<br><span style="font-size:14px">Press R to restart</span>`;
      this.messageEl.style.opacity = "1";
    } else {
      this.messageEl.style.opacity = "0";
    }
  }
}
