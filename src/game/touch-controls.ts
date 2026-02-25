import type { GameController } from "./game-controller";
import type { InputHandler } from "./input-handler";
import { MIN_TIME, MAX_TIME, MAX_AIM_ANGLE, MAX_OMEGA } from "./input-handler";

const CONTROL_PANEL_HEIGHT = 35; // Percentage of viewport height

export class TouchControls {
  private container: HTMLDivElement;
  private game: GameController;
  private input: InputHandler;

  // Control elements
  private aimingPanel: HTMLDivElement;
  private deliveringPanel: HTMLDivElement;
  private endScorePanel: HTMLDivElement;

  // Aiming controls
  private aimSlider!: HTMLDivElement;
  private aimThumb!: HTMLDivElement;
  private aimValue!: HTMLSpanElement;
  private aimMin!: number;
  private aimMax!: number;
  private powerSlider!: HTMLDivElement;
  private powerThumb!: HTMLDivElement;
  private powerValue!: HTMLSpanElement;
  private spinSlider!: HTMLDivElement;
  private spinThumb!: HTMLDivElement;
  private spinValue!: HTMLSpanElement;
  private spinMin!: number;
  private spinMax!: number;
  private throwBtn!: HTMLButtonElement;

  // Delivering controls
  private sweepBtn!: HTMLButtonElement;

  // End score controls
  private continueBtn!: HTMLButtonElement;
  private restartBtn!: HTMLButtonElement;

  private isDragging: { slider: "aim" | "power" | null; startX: number; startValue: number } | null = null;

  constructor(game: GameController, input: InputHandler) {
    this.game = game;
    this.input = input;

    this.container = document.createElement("div");
    this.container.id = "touch-controls";
    Object.assign(this.container.style, {
      position: "fixed",
      bottom: "0",
      left: "0",
      width: "100%",
      height: `${CONTROL_PANEL_HEIGHT}dvh`,
      pointerEvents: "auto",
      background: "rgba(0, 0, 0, 0.85)",
      backdropFilter: "blur(8px)",
      borderTop: "2px solid rgba(255, 255, 255, 0.2)",
      zIndex: "20",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px)) 16px",
      boxSizing: "border-box",
    });

    // Create panels for different game phases
    this.aimingPanel = this.createAimingPanel();
    this.deliveringPanel = this.createDeliveringPanel();
    this.endScorePanel = this.createEndScorePanel();

    this.container.appendChild(this.aimingPanel);
    this.container.appendChild(this.deliveringPanel);
    this.container.appendChild(this.endScorePanel);

    document.body.appendChild(this.container);

    // Update visibility based on initial phase
    this.updateVisibility();
  }

  private createAimingPanel(): HTMLDivElement {
    const panel = document.createElement("div");
    panel.id = "touch-controls-aiming";
    Object.assign(panel.style, {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      width: "100%",
    });

    // Aim slider
    const aimGroup = document.createElement("div");
    Object.assign(aimGroup.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "clamp(12px, 2.5vw, 14px)",
      color: "#fff",
    });

    const aimLabel = document.createElement("span");
    aimLabel.textContent = "Aim:";
    aimLabel.style.minWidth = "40px";

    this.aimMin = -MAX_AIM_ANGLE;
    this.aimMax = MAX_AIM_ANGLE;
    const aimSliderResult = this.createSlider("aim", this.aimMin, this.aimMax, 0, (value) => {
      this.input.setAimAngle(value);
      const deg = (value * 180 / Math.PI).toFixed(1);
      this.aimValue.textContent = `${deg}°`;
    });
    this.aimSlider = aimSliderResult.slider;
    this.aimThumb = aimSliderResult.thumb;

    this.aimValue = document.createElement("span");
    this.aimValue.textContent = "0.0°";
    this.aimValue.style.minWidth = "50px";
    this.aimValue.style.textAlign = "right";

    aimGroup.appendChild(aimLabel);
    aimGroup.appendChild(this.aimSlider);
    aimGroup.appendChild(this.aimValue);

    // Power slider
    const powerGroup = document.createElement("div");
    Object.assign(powerGroup.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "clamp(12px, 2.5vw, 14px)",
      color: "#fff",
    });

    const powerLabel = document.createElement("span");
    powerLabel.textContent = "Power:";
    powerLabel.style.minWidth = "40px";

    // Power slider is inverted: left = low power (high time), right = high power (low time)
    // Calculate initial normalized value: MAX_TIME (low power) = 0, MIN_TIME (high power) = 1
    const initialPowerNormalized = (MAX_TIME - this.input.aimTime) / (MAX_TIME - MIN_TIME);
    const powerSliderResult = this.createSlider("power", 0, 1, initialPowerNormalized, (normalized) => {
      // Invert: normalized 0 = MAX_TIME (low power), normalized 1 = MIN_TIME (high power)
      const value = MAX_TIME - normalized * (MAX_TIME - MIN_TIME);
      this.input.setAimTime(value);
      this.powerValue.textContent = `${value.toFixed(1)}s`;
    });
    this.powerSlider = powerSliderResult.slider;
    this.powerThumb = powerSliderResult.thumb;

    this.powerValue = document.createElement("span");
    this.powerValue.textContent = `${this.input.aimTime.toFixed(1)}s`;
    this.powerValue.style.minWidth = "50px";
    this.powerValue.style.textAlign = "right";

    powerGroup.appendChild(powerLabel);
    powerGroup.appendChild(this.powerSlider);
    powerGroup.appendChild(this.powerValue);

    // Spin slider
    const spinGroup = document.createElement("div");
    Object.assign(spinGroup.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "clamp(12px, 2.5vw, 14px)",
      color: "#fff",
    });

    const spinLabel = document.createElement("span");
    spinLabel.textContent = "Spin:";
    spinLabel.style.minWidth = "40px";

    this.spinMin = -MAX_OMEGA;
    this.spinMax = MAX_OMEGA;
    const spinSliderResult = this.createSlider("spin", this.spinMin, this.spinMax, this.input.aimOmega, (value) => {
      this.input.setAimOmega(value);
      this.spinValue.textContent = this.formatSpin(value);
    });
    this.spinSlider = spinSliderResult.slider;
    this.spinThumb = spinSliderResult.thumb;

    this.spinValue = document.createElement("span");
    this.spinValue.textContent = this.formatSpin(this.input.aimOmega);
    this.spinValue.style.minWidth = "50px";
    this.spinValue.style.textAlign = "right";

    spinGroup.appendChild(spinLabel);
    spinGroup.appendChild(this.spinSlider);
    spinGroup.appendChild(this.spinValue);

    // Throw button
    this.throwBtn = this.createButton("THROW STONE", () => {
      this.input.throwWithCurrentAim();
    });
    Object.assign(this.throwBtn.style, {
      marginTop: "4px",
      fontSize: "clamp(14px, 3vw, 18px)",
      fontWeight: "bold",
      padding: "12px",
      background: "linear-gradient(135deg, #00cc66, #00aa55)",
    });

    panel.appendChild(aimGroup);
    panel.appendChild(powerGroup);
    panel.appendChild(spinGroup);
    panel.appendChild(this.throwBtn);

    return panel;
  }

  private createDeliveringPanel(): HTMLDivElement {
    const panel = document.createElement("div");
    panel.id = "touch-controls-delivering";
    Object.assign(panel.style, {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
    });

    this.sweepBtn = this.createButton("SWEEP", () => {
      this.game.setSweeping(true);
    });
    Object.assign(this.sweepBtn.style, {
      fontSize: "clamp(18px, 4vw, 24px)",
      fontWeight: "bold",
      padding: "16px 32px",
      background: "linear-gradient(135deg, #00ff88, #00cc66)",
      width: "100%",
      maxWidth: "400px",
    });

    // Handle touch end to stop sweeping
    this.sweepBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.game.setSweeping(false);
    });
    this.sweepBtn.addEventListener("touchcancel", (e) => {
      e.preventDefault();
      this.game.setSweeping(false);
    });
    this.sweepBtn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      this.game.setSweeping(false);
    });
    this.sweepBtn.addEventListener("pointercancel", (e) => {
      e.preventDefault();
      this.game.setSweeping(false);
    });

    panel.appendChild(this.sweepBtn);
    return panel;
  }

  private createEndScorePanel(): HTMLDivElement {
    const panel = document.createElement("div");
    panel.id = "touch-controls-endscore";
    Object.assign(panel.style, {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "12px",
      width: "100%",
    });

    this.continueBtn = this.createButton("CONTINUE", () => {
      // This will be handled by game logic - button only shows during END_SCORE
      // For now, we'll let the game handle it automatically
    });
    Object.assign(this.continueBtn.style, {
      fontSize: "clamp(14px, 3vw, 18px)",
      padding: "12px 24px",
      background: "linear-gradient(135deg, #4a90e2, #357abd)",
    });

    this.restartBtn = this.createButton("RESTART", () => {
      this.game.resetGame();
    });
    Object.assign(this.restartBtn.style, {
      fontSize: "clamp(14px, 3vw, 18px)",
      padding: "12px 24px",
      background: "linear-gradient(135deg, #ff4455, #cc3344)",
    });

    panel.appendChild(this.continueBtn);
    panel.appendChild(this.restartBtn);
    return panel;
  }

  private createSlider(
    id: string,
    min: number,
    max: number,
    initialValue: number,
    onChange: (value: number) => void
  ): { slider: HTMLDivElement; thumb: HTMLDivElement } {
    const slider = document.createElement("div");
    slider.id = `slider-${id}`;
    Object.assign(slider.style, {
      position: "relative",
      flex: "1",
      height: "44px",
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: "8px",
      cursor: "pointer",
      touchAction: "none",
    });

    const track = document.createElement("div");
    Object.assign(track.style, {
      position: "absolute",
      top: "50%",
      left: "0",
      right: "0",
      height: "4px",
      background: "rgba(255, 255, 255, 0.2)",
      borderRadius: "2px",
      transform: "translateY(-50%)",
    });

    const thumb = document.createElement("div");
    thumb.id = `thumb-${id}`;
    Object.assign(thumb.style, {
      position: "absolute",
      top: "50%",
      width: "20px",
      height: "20px",
      background: "#00ff88",
      borderRadius: "50%",
      transform: "translate(-50%, -50%)",
      boxShadow: "0 2px 8px rgba(0, 255, 136, 0.5)",
      transition: "background 0.2s",
    });

    slider.appendChild(track);
    slider.appendChild(thumb);

    const updateThumb = (value: number) => {
      const normalized = (value - min) / (max - min);
      const left = normalized * 100;
      thumb.style.left = `${Math.max(0, Math.min(100, left))}%`;
    };

    const handlePointerDown = (e: PointerEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = slider.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const normalized = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const value = min + normalized * (max - min);
      onChange(value);
      updateThumb(value);

      this.isDragging = {
        slider: id as "aim" | "power",
        startX: clientX,
        startValue: value,
      };
    };

    const handlePointerMove = (e: PointerEvent | TouchEvent) => {
      if (!this.isDragging || this.isDragging.slider !== id) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = slider.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - this.isDragging.startX;
      const deltaValue = (deltaX / rect.width) * (max - min);
      const value = Math.max(min, Math.min(max, this.isDragging.startValue + deltaValue));
      onChange(value);
      updateThumb(value);
    };

    const handlePointerUp = (e: PointerEvent | TouchEvent) => {
      if (!this.isDragging || this.isDragging.slider !== id) return;
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = null;
    };

    slider.addEventListener("pointerdown", handlePointerDown);
    slider.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("touchmove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("touchcancel", handlePointerUp);

    updateThumb(initialValue);
    return { slider, thumb };
  }

  private syncSliders(): void {
    // Sync aim slider
    const aimNormalized = (this.input.aimAngle - this.aimMin) / (this.aimMax - this.aimMin);
    const aimLeft = aimNormalized * 100;
    this.aimThumb.style.left = `${Math.max(0, Math.min(100, aimLeft))}%`;
    const aimDeg = (this.input.aimAngle * 180 / Math.PI).toFixed(1);
    this.aimValue.textContent = `${aimDeg}°`;

    // Sync power slider (inverted mapping)
    // Convert time to normalized: MAX_TIME (low power) = 0, MIN_TIME (high power) = 1
    const powerNormalized = (MAX_TIME - this.input.aimTime) / (MAX_TIME - MIN_TIME);
    const powerLeft = powerNormalized * 100;
    this.powerThumb.style.left = `${Math.max(0, Math.min(100, powerLeft))}%`;
    this.powerValue.textContent = `${this.input.aimTime.toFixed(1)}s`;

    // Sync spin slider
    const spinNormalized = (this.input.aimOmega - this.spinMin) / (this.spinMax - this.spinMin);
    const spinLeft = spinNormalized * 100;
    this.spinThumb.style.left = `${Math.max(0, Math.min(100, spinLeft))}%`;
    this.spinValue.textContent = this.formatSpin(this.input.aimOmega);
  }

  private formatSpin(value: number): string {
    return value.toFixed(1);
  }

  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: "10px 16px",
      fontSize: "clamp(12px, 2.5vw, 14px)",
      color: "#fff",
      background: "rgba(255, 255, 255, 0.15)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "8px",
      cursor: "pointer",
      touchAction: "manipulation",
      userSelect: "none",
      transition: "background 0.2s, transform 0.1s",
      minHeight: "44px",
    });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });

    btn.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      btn.style.background = "rgba(255, 255, 255, 0.25)";
      btn.style.transform = "scale(0.95)";
    });

    btn.addEventListener("touchend", (e) => {
      e.stopPropagation();
      btn.style.background = "rgba(255, 255, 255, 0.15)";
      btn.style.transform = "scale(1)";
    });

    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      btn.style.background = "rgba(255, 255, 255, 0.25)";
      btn.style.transform = "scale(0.95)";
    });

    btn.addEventListener("pointerup", (e) => {
      e.stopPropagation();
      btn.style.background = "rgba(255, 255, 255, 0.15)";
      btn.style.transform = "scale(1)";
    });

    return btn;
  }


  updateVisibility(): void {
    const phase = this.game.phase;
    this.aimingPanel.style.display = phase === "AIMING" ? "flex" : "none";
    this.deliveringPanel.style.display = phase === "DELIVERING" ? "flex" : "none";
    
    if (phase === "END_SCORE" || phase === "GAME_OVER") {
      this.endScorePanel.style.display = "flex";
      this.continueBtn.style.display = phase === "END_SCORE" ? "block" : "none";
      this.restartBtn.style.display = "block";
    } else {
      this.endScorePanel.style.display = "none";
    }

  }

  /** Sync slider positions and values with current input state */
  sync(): void {
    if (this.game.phase === "AIMING") {
      this.syncSliders();
    }
  }

  /** Get the height of the control panel in pixels */
  getHeight(): number {
    return this.container.getBoundingClientRect().height;
  }

  dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
