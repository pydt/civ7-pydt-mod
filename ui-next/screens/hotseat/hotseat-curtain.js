import { template, use, insert } from '../../../../core/vendor/solid-js/web/dist/web.js';
import { createMemo, createSignal, createEffect, onMount, onCleanup, createComponent, Show, createRenderEffect } from '../../../../core/vendor/solid-js/dist/solid.js';
import ContextManager from '../../../../core/ui/context-manager/context-manager.js';
import { DisplayQueueManager } from '../../../../core/ui/context-manager/display-queue-manager.js';
import { PlotCursor } from '../../../../core/ui/input/plot-cursor.js';
import { InterfaceMode, InterfaceModeChangedEventName } from '../../../../core/ui/interface-modes/interface-modes.js';
import { SaveLoadClosedEventName } from '../../../../core/ui/save-load/screen-save-load.js';
import { getPlayerColorVariants } from '../../../../core/ui/utilities/utilities-color.js';
import { Icon } from '../../../../core/ui/utilities/utilities-image.js';
import { Activatable } from '../../../../core/ui-next/components/activatable.js';
import { Button } from '../../../../core/ui-next/components/button.js';
import { defineLegacyComponent } from '../../../../core/ui-next/components/fxs-solid-component.js';
import { Header } from '../../../../core/ui-next/components/header.js';
import { Icon as Icon$1 } from '../../../../core/ui-next/components/icon.js';
import { L10n } from '../../../../core/ui-next/components/l10n.js';
import { ComponentRegistry } from '../../../../core/ui-next/services/component-registry.js';
import { FocusManager } from '../../../../core/ui-next/services/focus-manager.js';
import { useHotkeyContext } from '../../../../core/ui-next/services/hotkey.js';
import { IsControllerActive } from '../../../../core/ui-next/services/input.js';
import { useLocalPlayerId } from '../../../../core/ui-next/utilities/game-core-utilities.js';
import { createPauseMenuModel } from '../pause-menu/pause-menu-model.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="ps-btn-icon ps-bar-pause"></div>`), _tmpl$2 = /* @__PURE__ */ template(`<div tabindex=-1 class="fixed flex justify-center items-center w-screen h-screen top-0 left-0 pointer-events-auto"><div class="absolute inset-0 bg-cover bg-no-repeat"></div><div class="absolute inset-0 bg-cover bg-no-repeat"></div><div class="absolute flex flex-col items-center min-w-128 p-3"><div class="absolute inset-0 img-unit-panelbox"><div class="absolute size-4 bg-contain rotate-180 top-3 left-2"></div><div class="absolute size-4 bg-contain -rotate-90 top-3 right-2"></div><div class="absolute size-4 bg-contain rotate-90 bottom-3 left-2"></div><div class="absolute size-4 bg-contain rotate-0 bottom-3 right-2"></div></div><div class="flex justify-center absolute"><div class="absolute -top-7 flex items-center justify-center pb-2"><div class="absolute w-28 h-32 bg-no-repeat bg-center bg-contain"></div><div class="absolute w-28 h-32 bg-no-repeat bg-center bg-contain"></div><div class="absolute inset-0 flex items-center justify-center pb-2"></div></div><div class="absolute flex justify-center items-center top-8"><div class="absolute size-11 bg-center bg-cover"></div><div class="absolute size-12 bg-center bg-cover"></div><div class="absolute size-9 bg-center bg-cover"></div></div></div><div class="relative flex justify-center"><div class="w-48 h-7 bg-contain -rotate-y-180"></div><div class="w-48 h-7 bg-contain ml-12"></div></div><div class="relative mt-5 mb-1 pointer-events-auto font-body text-xs text-secondary-2"></div><div class="relative filigree-divider-h3"></div><div class="flex justify-center mx-8"></div></div></div>`);

// Tracks how many turns have been started in this game session.
// Persists across component instances so the second curtain appearance is disabled.
let turnStartedCount = 0;

// Reads the display name for the given player ID from the PYDT property.
// The API encodes names as |names=<base64(JSON)> on the PYDT_TURN string.
function getPydtPlayerName(playerID) {
  const pydtValue = GameTutorial.getProperty("PYDT");
  if (!pydtValue) return null;
  try {
    const parsed = JSON.parse(pydtValue);
    return parsed.names[String(playerID)] ?? null;
  } catch {
    return null;
  }
}

const HotseatCurtainComponent = (_props) => {
  let root;
  const localPlayerID = useLocalPlayerId();
  const player = createMemo(() => Players.get(localPlayerID()));
  const hotkeyContext = useHotkeyContext();
  const name = createMemo(() => {
    const pydtName = getPydtPlayerName(localPlayerID());
    if (pydtName) return pydtName;
    const currentPlayer = player();
    return currentPlayer ? Locale.compose(currentPlayer.name) : localPlayerID().toString();
  });
  const leaderName = createMemo(() => {
    const currentPlayer = player();
    return currentPlayer ? Locale.compose(currentPlayer.leaderName) : localPlayerID().toString();
  });
  const leaderIcon = createMemo(() => {
    const currentPlayer = player();
    if (currentPlayer) {
      const leaderDef = GameInfo.Leaders.lookup(currentPlayer.leaderType);
      return leaderDef ? UI.getIconCSS(leaderDef.LeaderType) : "";
    }
    return "";
  });
  const playerPrimaryColor = createMemo(() => {
    const variants = getPlayerColorVariants(localPlayerID());
    return variants ? variants.primaryColor.mainColor : "";
  });
  const playerSecondaryColor = createMemo(() => {
    const variants = getPlayerColorVariants(localPlayerID());
    return variants ? variants.secondaryColor.mainColor : "";
  });
  const civIcon = createMemo(() => {
    const currentPlayer = player();
    return currentPlayer ? Icon.getCivSymbolFromCivilizationType(currentPlayer.civilizationType) : "";
  });
  const [visible, setVisible] = createSignal(true);
  const [externalRemove, setExternalRemove] = createSignal(false);
  // Disabled when this is not the first curtain appearance in the session.
  const [startTurnDisabled] = createSignal(turnStartedCount > 0);
  const pauseModel = createPauseMenuModel();
  createEffect(() => {
    if (visible()) {
      FocusManager.get().setFocus(root);
      hotkeyContext.refresh();
    }
  });
  onMount(() => {
    DisplayQueueManager.suspend();
    InterfaceMode.switchTo("INTERFACEMODE_HOTSEAT");
    window.addEventListener("navigate-input", onNavigateInput);
    window.addEventListener("engine-input", onEngineInput);
    window.addEventListener(SaveLoadClosedEventName, onSaveClosed);
    window.addEventListener(InterfaceModeChangedEventName, onInterfaceModeChanged);
    Network.hotseatCurtainChanged(true);
  });
  onCleanup(() => {
    window.removeEventListener("navigate-input", onNavigateInput);
    window.removeEventListener("engine-input", onEngineInput);
    window.removeEventListener(SaveLoadClosedEventName, onSaveClosed);
    window.removeEventListener(InterfaceModeChangedEventName, onInterfaceModeChanged);
    Network.hotseatCurtainChanged(false);
    if (DisplayQueueManager.isSuspended()) {
      DisplayQueueManager.resume();
    }
    if (!externalRemove()) {
      waitForLayout(() => {
        InterfaceMode.switchToDefault();
        tryFocusOnCapital();
        sendTurnStartAcknowledgement();
      });
    }
  });
  const tryFocusOnCapital = () => {
    const player2 = Players.get(GameContext.localPlayerID);
    if (player2) {
      const playerCities = player2.Cities;
      if (playerCities && playerCities.getCities().length > 0) {
        const capital = playerCities.getCapital();
        const location = capital ? capital.location : playerCities.getCities()[0].location;
        PlotCursor.plotCursorCoords = location;
        PlotCursor.showCursor();
      }
    }
  };
  const sendTurnStartAcknowledgement = () => {
    const args = {};
    const result = Game.PlayerOperations.canStart(localPlayerID(), PlayerOperationTypes.ACKNOWLEDGE_TURN_START, args, false);
    if (result.Success) {
      Game.PlayerOperations.sendRequest(localPlayerID(), PlayerOperationTypes.ACKNOWLEDGE_TURN_START, args);
    }
  };
  const onNavigateInput = (navigationEvent) => {
    navigationEvent.preventDefault();
    navigationEvent.stopImmediatePropagation();
  };
  const onEngineInput = (inputEvent) => {
    const {
      name: name2,
      status
    } = inputEvent.detail;
    if (status != InputActionStatuses.FINISH) {
      return;
    }
    if (name2 == "sys-menu") {
      onShowPauseMenu();
      inputEvent.preventDefault();
      inputEvent.stopPropagation();
    } else if (name2 == "accept") {
      onStartTurn();
      inputEvent.preventDefault();
      inputEvent.stopPropagation();
    } else if (name2 == "shell-action-2") {
      onSaveGame();
      inputEvent.preventDefault();
      inputEvent.stopPropagation();
    }
  };
  const onSaveGame = () => {
    GameTutorial.setProperty("PYDT", JSON.stringify({
      player: GameContext.localPlayerID,
      turn: Game.turn
    }));
    setVisible(false);
    DisplayQueueManager.suspend();
    pauseModel.onClickSave();
  };
  const onSaveClosed = () => {
    setVisible(true);
  };
  const onStartTurn = () => {
    if (visible() && !startTurnDisabled()) {
      turnStartedCount++;
      removeCurtain();
    }
  };
  const removeCurtain = () => {
    const curtain = document.getElementById("hotseat-screen-curtain");
    curtain?.remove();
  };
  const onShowPauseMenu = () => {
    if (!visible()) {
      return;
    }
    setVisible(false);
    DisplayQueueManager.suspend();
    if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_PAUSE_MENU")) {
      InterfaceMode.switchTo("INTERFACEMODE_PAUSE_MENU");
    }
  };
  const onInterfaceModeChanged = (event) => {
    const currentMode = event.detail.newMode;
    const prevMode = event.detail.prevMode;
    if (currentMode == "INTERFACEMODE_DEFAULT" && prevMode == "INTERFACEMODE_PAUSE_MENU") {
      if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_HOTSEAT")) {
        InterfaceMode.switchTo("INTERFACEMODE_HOTSEAT");
      }
      setVisible(true);
    }
    if (currentMode == "INTERFACEMODE_CINEMATIC" && prevMode == "INTERFACEMODE_HOTSEAT") {
      if (!ContextManager.canOpenPauseMenu()) {
        setExternalRemove(true);
        removeCurtain();
      }
    }
  };
  return createComponent(Show, {
    get when() {
      return visible();
    },
    get children() {
      var _el$ = _tmpl$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling, _el$4 = _el$3.nextSibling, _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.nextSibling, _el$8 = _el$7.nextSibling, _el$9 = _el$8.nextSibling, _el$10 = _el$5.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling, _el$14 = _el$13.nextSibling, _el$15 = _el$11.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$17.nextSibling, _el$19 = _el$10.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$19.nextSibling, _el$23 = _el$22.nextSibling, _el$24 = _el$23.nextSibling;
      var _ref$ = root;
      typeof _ref$ === "function" ? use(_ref$, _el$) : root = _el$;
      _el$2.style.setProperty("background-image", "url(blp:BG_CYC_4K_graded)");
      _el$3.style.setProperty("background-image", "url(blp:sa_4-3Challenges)");
      _el$3.style.setProperty("opacity", "0.06");
      _el$6.style.setProperty("background-image", "url(blp:mp_player_detail)");
      _el$7.style.setProperty("background-image", "url(blp:mp_player_detail)");
      _el$8.style.setProperty("background-image", "url(blp:mp_player_detail)");
      _el$9.style.setProperty("background-image", "url(blp:mp_player_detail)");
      _el$12.style.setProperty("background-image", "url(blp:lp_hex_bk_128)");
      _el$13.style.setProperty("background-image", "url(blp:lp_hex_color_128)");
      insert(_el$14, createComponent(Icon$1, {
        get name() {
          return leaderIcon();
        },
        "class": "size-36 mb-1"
      }));
      _el$16.style.setProperty("background-image", "url(blp:final_civ-frame)");
      _el$17.style.setProperty("background-image", "url(blp:lp_circ_color_128)");
      _el$20.style.setProperty("background-image", "url(blp:resource_title_accent)");
      _el$21.style.setProperty("background-image", "url(blp:resource_title_accent)");
      insert(_el$22, createComponent(L10n.Stylize, {
        get text() {
          return leaderName();
        }
      }));
      insert(_el$4, createComponent(Header, {
        "class": "relative",
        get children() {
          return createComponent(L10n.Stylize, {
            get text() {
              return name();
            }
          });
        }
      }), _el$23);
      insert(_el$24, createComponent(Button, {
        navTrayText: "LOC_HOTSEAT_SAVE_GAME",
        hotkeyAction: "shell-action-2",
        "class": "text-xs h-12 mr-2",
        onActivate: onSaveGame,
        get children() {
          return createComponent(L10n.Compose, {
            text: "LOC_HOTSEAT_SAVE_GAME"
          });
        }
      }), null);
      insert(_el$24, createComponent(Button, {
        navTrayText: "LOC_HOTSEAT_START_TURN",
        hotkeyAction: "accept",
        "class": "text-xs h-12",
        get disabled() { return startTurnDisabled(); },
        onActivate: onStartTurn,
        get children() {
          return createComponent(L10n.Compose, {
            text: "LOC_HOTSEAT_START_TURN"
          });
        }
      }), null);
      insert(_el$, createComponent(Activatable, {
        "class": "ps-btn top-0 right-0",
        get ["data-tooltip-content"]() {
          return Locale.compose("LOC_UI_PAUSE");
        },
        navTrayText: "LOC_UI_PAUSE",
        hotkeyAction: "sys-menu",
        onActivate: onShowPauseMenu,
        get children() {
          var _el$25 = _tmpl$();
          _el$25.style.setProperty("background-image", "url(blp:System_Pause)");
          return _el$25;
        }
      }), null);
      createRenderEffect((_p$) => {
        var _v$ = playerSecondaryColor(), _v$2 = playerPrimaryColor(), _v$3 = `url(${civIcon()})`, _v$4 = playerSecondaryColor(), _v$5 = !IsControllerActive(), _v$6 = !IsControllerActive();
        _v$ !== _p$.e && ((_p$.e = _v$) != null ? _el$13.style.setProperty("fxs-background-image-tint", _v$) : _el$13.style.removeProperty("fxs-background-image-tint"));
        _v$2 !== _p$.t && ((_p$.t = _v$2) != null ? _el$17.style.setProperty("fxs-background-image-tint", _v$2) : _el$17.style.removeProperty("fxs-background-image-tint"));
        _v$3 !== _p$.a && ((_p$.a = _v$3) != null ? _el$18.style.setProperty("background-image", _v$3) : _el$18.style.removeProperty("background-image"));
        _v$4 !== _p$.o && ((_p$.o = _v$4) != null ? _el$18.style.setProperty("fxs-background-image-tint", _v$4) : _el$18.style.removeProperty("fxs-background-image-tint"));
        _v$5 !== _p$.i && _el$24.classList.toggle("mt-2", _p$.i = _v$5);
        _v$6 !== _p$.n && _el$24.classList.toggle("mb-8", _p$.n = _v$6);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0,
        n: void 0
      });
      return _el$;
    }
  });
};
defineLegacyComponent("hotseat-curtain", {}, (attrs, el) => {
  return createComponent(HotseatCurtainComponent, {
    attrs,
    el
  });
});
const HotseatCurtain = ComponentRegistry.register({
  name: "HotseatCurtain",
  createInstance: HotseatCurtainComponent,
  images: ["blp:sa_4-3Challenges", "blp:BG_CYC_4K_graded", "blp:hud_unit-panel_box-bg"]
});

export { HotseatCurtain };
//# sourceMappingURL=hotseat-curtain.js.map
