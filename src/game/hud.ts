import type { GameController } from "./game-controller";
import type { InputHandler } from "./input-handler";

export class HUD {
  private container: HTMLDivElement;
  private scoreEl: HTMLDivElement;
  private turnInfoEl: HTMLDivElement;
  private sweepIndicator: HTMLDivElement;
  private messageEl: HTMLDivElement;
  private controlsEl: HTMLDivElement;
  private isTouchDevice: boolean;

  constructor() {
    // Detect touch device
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
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
      top: "clamp(8px, 2vh, 16px)",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: "clamp(12px, 2vw, 24px)",
      fontSize: "clamp(14px, 3vw, 18px)",
      background: "rgba(0,0,0,0.6)",
      padding: "clamp(6px, 1.5vh, 10px) clamp(12px, 3vw, 24px)",
      borderRadius: "8px",
      backdropFilter: "blur(4px)",
    });

    this.turnInfoEl = this.makeEl("turnInfo", {
      position: "absolute",
      top: "clamp(50px, 8vh, 70px)",
      left: "50%",
      transform: "translateX(-50%)",
      fontSize: "clamp(11px, 2.5vw, 14px)",
      background: "rgba(0,0,0,0.5)",
      padding: "clamp(4px, 1vh, 6px) clamp(8px, 2vw, 16px)",
      borderRadius: "6px",
      textAlign: "center",
      maxWidth: "95%",
    });

    this.sweepIndicator = this.makeEl("sweep", {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      fontSize: "clamp(20px, 5vw, 28px)",
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
      fontSize: "clamp(18px, 4vw, 24px)",
      fontWeight: "bold",
      textAlign: "center",
      background: "rgba(0,0,0,0.7)",
      padding: "clamp(12px, 2vh, 16px) clamp(20px, 4vw, 32px)",
      borderRadius: "10px",
      opacity: "0",
      transition: "opacity 0.3s",
      maxWidth: "90%",
    });

    this.controlsEl = this.makeEl("controls", {
      position: "absolute",
      bottom: this.isTouchDevice ? "calc(35vh + 8px)" : "16px",
      left: "50%",
      transform: "translateX(-50%)",
      fontSize: "clamp(10px, 2vw, 12px)",
      color: "rgba(255,255,255,0.5)",
      textAlign: "center",
      display: this.isTouchDevice ? "none" : "block",
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
      this.turnInfoEl.innerHTML = this.isTouchDevice 
        ? `Hold <b>SWEEP</b> button to sweep`
        : `Hold <b>SPACE</b> to sweep`;
      this.turnInfoEl.style.opacity = "1";
    } else {
      this.turnInfoEl.style.opacity = "0.5";
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
      const restartHint = this.isTouchDevice 
        ? '<span style="font-size:clamp(11px, 2.5vw, 14px)">Tap RESTART to play again</span>'
        : '<span style="font-size:clamp(11px, 2.5vw, 14px)">Press R to restart</span>';
      this.messageEl.innerHTML = `Game Over!<br>${winner} wins ${game.totalScore.red}-${game.totalScore.yellow}<br>${restartHint}`;
      this.messageEl.style.opacity = "1";
    } else {
      this.messageEl.style.opacity = "0";
    }
  }
}
