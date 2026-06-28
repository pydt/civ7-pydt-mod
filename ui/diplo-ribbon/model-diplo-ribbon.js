import { Audio } from '../../../core/ui/audio-base/audio-support.js';
import { InterfaceMode } from '../../../core/ui/interface-modes/interface-modes.js';
import { Icon } from '../../../core/ui/utilities/utilities-image.js';
import DiplomacyManager from '../diplomacy/diplomacy-manager.js';
import VictoryProgress from '../victory-progress/model-victory-progress.js';

// PYDT: read the display name for a player from the PYDT save property.
function getPydtPlayerName(playerID) {
  try {
    const payload = JSON.parse(GameTutorial.getProperty("PYDT") ?? "{}");
    return payload.names?.[String(playerID)] ?? null;
  } catch {
    return null;
  }
}

var RibbonStatsToggleStatus = /* @__PURE__ */ ((RibbonStatsToggleStatus2) => {
  RibbonStatsToggleStatus2[RibbonStatsToggleStatus2["RibbonStatsHidden"] = 0] = "RibbonStatsHidden";
  RibbonStatsToggleStatus2[RibbonStatsToggleStatus2["RibbonStatsShowing"] = 1] = "RibbonStatsShowing";
  return RibbonStatsToggleStatus2;
})(RibbonStatsToggleStatus || {});
var RibbonDisplayType = /* @__PURE__ */ ((RibbonDisplayType2) => {
  RibbonDisplayType2[RibbonDisplayType2["Yields"] = 1] = "Yields";
  RibbonDisplayType2[RibbonDisplayType2["Size"] = 2] = "Size";
  RibbonDisplayType2[RibbonDisplayType2["Scores"] = 3] = "Scores";
  return RibbonDisplayType2;
})(RibbonDisplayType || {});
var RibbonYieldType = /* @__PURE__ */ ((RibbonYieldType2) => {
  RibbonYieldType2["Default"] = "default";
  RibbonYieldType2["Gold"] = "gold";
  RibbonYieldType2["Culture"] = "culture";
  RibbonYieldType2["Science"] = "science";
  RibbonYieldType2["Happiness"] = "happiness";
  RibbonYieldType2["Diplomacy"] = "diplomacy";
  RibbonYieldType2["Trade"] = "trade";
  RibbonYieldType2["Settlements"] = "settlements";
  RibbonYieldType2["Property"] = "property";
  RibbonYieldType2["Victory"] = "victory";
  return RibbonYieldType2;
})(RibbonYieldType || {});
var DiploRibbonRelgionIdeologyIconTints = /* @__PURE__ */ ((DiploRibbonRelgionIdeologyIconTints2) => {
  DiploRibbonRelgionIdeologyIconTints2["SameReligionIdeology"] = "#579544";
  DiploRibbonRelgionIdeologyIconTints2["RivalReligionIdeology"] = "#944356";
  return DiploRibbonRelgionIdeologyIconTints2;
})(DiploRibbonRelgionIdeologyIconTints || {});
const RibbonDisplayOptionNames = /* @__PURE__ */ new Map([
  [3 /* Scores */, "RibbonShowScores"],
  [2 /* Size */, "RibbonShowSize"],
  [1 /* Yields */, "RibbonShowYields"]
]);
const UpdateDiploRibbonEventName = "update-diplo-ribbon";
class UpdateDiploRibbonEvent extends CustomEvent {
  constructor() {
    super(UpdateDiploRibbonEventName, { bubbles: false });
  }
}
class PlayerUpdateQueue {
  queue = /* @__PURE__ */ new Set();
  // Add a player and return true if it was added, false if it was already there
  add(playerId) {
    if (this.queue.has(playerId) == false) {
      this.queue.add(playerId);
      return true;
    }
    return false;
  }
  clear() {
    this.queue.clear();
  }
}
class DiploRibbonModel {
  static _Instance;
  onUpdate;
  updateQueued = false;
  _playerData = [];
  _localPlayerStats = [];
  _diploStatementPlayerData = [];
  refDataModelChangedQueue = 0;
  playerYieldUpdateQueue = new PlayerUpdateQueue();
  playerScoreUpdateQueue = new PlayerUpdateQueue();
  playerSizeUpdateQueue = new PlayerUpdateQueue();
  playerGlobalTokensUpdateQueue = new PlayerUpdateQueue();
  playerSanctionUpdateQueue = new PlayerUpdateQueue();
  playerWarUpdateQueue = new PlayerUpdateQueue();
  selected = false;
  canClick = false;
  _sectionSelected = {
    playerId: PlayerIds.NO_PLAYER,
    section: "unset"
  };
  _ribbonDisplayTypes = [1 /* Yields */];
  previousDisplayTypes = this._ribbonDisplayTypes;
  RIBBON_DISPLAY_OPTION_SET = "user";
  RIBBON_DISPLAY_OPTION_TYPE = "Interface";
  _alwaysShowYields = 0 /* RibbonStatsHidden */;
  _userDiploRibbonsToggled = 0 /* RibbonStatsHidden */;
  _eventNotificationRefresh = new LiteEvent();
  updateDiploRibbonListener = this.queueUpdate.bind(this);
  interfaceModeChangedListener = this.onInterfaceModeChanged.bind(this);
  diplomacyDialogNextListener = this.updateDiploStatementPlayerData.bind(this);
  constructor() {
    this.updateAll();
    engine.on("AdvancedStartEffectUsed", this.effectUsedListener, this);
    engine.on("AttributeNodeCompleted", this.onAttributeNodeCompleted, this);
    engine.on("AutoplayEnded", this.onAutoplayEnd, this);
    engine.on("AutoplayStarted", this.onAutoplayStarted, this);
    engine.on("CityReligionChanged", this.queueUpdate, this);
    engine.on("CityPopulationChanged", this.onCityPopulationChanged, this);
    engine.on("CityYieldChanged", this.onCityYieldChanged, this);
    engine.on("CultureNodeCompleted", this.queueUpdate, this);
    engine.on("CultureYieldChanged", this.onCultureYieldChanged, this);
    engine.on("DiplomacyDeclareWar", this.onDiplomacyDeclareWar, this);
    engine.on("DiplomacyEventCanceled", this.onActionCanceled, this);
    engine.on("DiplomacyEventEnded", this.queueUpdate, this);
    engine.on("DiplomacyEventStarted", this.queueUpdate, this);
    engine.on("DiplomacyEventSupportChanged", this.onSupportChanged, this);
    engine.on("DiplomacyGlobalTokensChanged", this.onGlobalTokensChanged, this);
    engine.on("DiplomacyMakePeace", this.onDiplomacyMakePeace, this);
    engine.on("DiplomacyMeet", this.onDiplomacyMeet, this);
    engine.on("DiplomacyMeetMajors", this.onDiplomacyMeet, this);
    engine.on("DiplomacyRelationshipLevelChanged", this.queueUpdate, this);
    engine.on("DiplomacyRelationshipStatusChanged", this.onRelationshipStatusChanged, this);
    engine.on("DiplomacyTreasuryChanged", this.onDiplomacyTreasuryChanged, this);
    engine.on("GoodyHutReward", this.queueUpdate, this);
    engine.on("LocalPlayerChanged", this.onLocalPlayerChanged, this);
    engine.on("MultiplayerPostPlayerDisconnected", this.onPlayerPostDisconnected, this);
    engine.on("PlayerAgeTransitionComplete", this.onPlayerAgeTransitionComplete, this);
    engine.on("PlayerInfoChanged", this.onPlayerInfoChanged, this);
    engine.on("PlayerSettlementCapChanged", this.onPlayerSettlementCapChanged, this);
    engine.on("PlayersSwapped", this.onPlayersSwapped, this);
    engine.on("PlayerTurnActivated", this.onPlayerTurnActivated, this);
    engine.on("PlayerTurnDeactivated", this.onPlayerTurnDeactivated, this);
    engine.on("PlayerYieldChanged", this.onPlayerYieldChanged, this);
    engine.on("ScienceYieldChanged", this.onResearchYieldChanged, this);
    engine.on("TraditionChanged", this.onPolicyChanged, this);
    engine.on("TreasuryChanged", this.onTreasuryChanged, this);
    engine.on("WonderCompleted", this.onWonderCompleted, this);
    engine.on("NarrativeChoiceMade", this.onNarrativeChoiceMade, this);
    window.addEventListener("main-menu-return", this.updateDiploRibbonListener);
    window.addEventListener("update-diplo-ribbon", this.updateDiploRibbonListener);
    window.addEventListener("interface-mode-changed", this.interfaceModeChangedListener);
    window.addEventListener("diplomacy-dialog-next", this.diplomacyDialogNextListener);
  }
  static getInstance() {
    if (!DiploRibbonModel._Instance) {
      DiploRibbonModel._Instance = new DiploRibbonModel();
    }
    return DiploRibbonModel._Instance;
  }
  get playerData() {
    return this._playerData;
  }
  get diploStatementPlayerData() {
    return this._diploStatementPlayerData;
  }
  get localPlayerStats() {
    return this._localPlayerStats;
  }
  set sectionSelected(value) {
    this._sectionSelected = value;
  }
  get sectionSelected() {
    return this._sectionSelected;
  }
  get ribbonDisplayTypes() {
    return this._ribbonDisplayTypes;
  }
  get eventNotificationRefresh() {
    return this._eventNotificationRefresh.expose();
  }
  get alwaysShowYields() {
    return this._alwaysShowYields;
  }
  get areRibbonYieldsStuckOnScreen() {
    return this._alwaysShowYields == 1 /* RibbonStatsShowing */ || this._userDiploRibbonsToggled == 1 /* RibbonStatsShowing */;
  }
  set userDiploRibbonsToggled(newStatus) {
    this._userDiploRibbonsToggled = newStatus;
  }
  get userDiploRibbonsToggled() {
    return this._userDiploRibbonsToggled;
  }
  setRibbonDisplayOption(type, value) {
    const optionName = RibbonDisplayOptionNames.get(type);
    if (!optionName) {
      console.error("model-diplo-ribbon: Unable to get optionName with RibbonDisplayType: " + type);
      return;
    }
    UI.setOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, optionName, value);
    this.queueUpdate();
  }
  set updateCallback(callback) {
    this.onUpdate = callback;
  }
  updateAll() {
    this.getRibbonDisplayTypesFromUserOptions();
    VictoryProgress.update();
    const playerList = Players.getAlive();
    const localPlayerID = GameContext.localObserverID;
    const localPlayer = Players.get(localPlayerID);
    if (!localPlayer) {
      if (!Autoplay.isActive) {
        console.error("model-diplo-ribbon: Unable to find local player library, can't update player data!");
      }
      return;
    }
    const localPlayerDiplomacy = localPlayer.Diplomacy;
    if (!localPlayerDiplomacy) {
      console.error("model-diplo-ribbon: Unable to find local player diplomacy, can't update player data!");
      return;
    }
    this._playerData = [];
    const localPlayerData = this.createPlayerData(localPlayer, localPlayerDiplomacy, true);
    if (localPlayerData.religionIdeology && localPlayerData.religionIdeology.isIdeology) {
      localPlayerData.religionIdeology.iconTint = "#579544" /* SameReligionIdeology */;
    }
    this._playerData.push(localPlayerData);
    for (const p of playerList) {
      if (p.isMajor && p.id != localPlayerID && (localPlayerDiplomacy.hasMet(p.id) || p.isHuman)) {
        const playerDiplomacy = p.Diplomacy;
        if (!playerDiplomacy) {
          console.error("model-diplo-ribbon: unable to find PlayerDiplomacy for player with id: " + p.id);
          return;
        }
        const relationShipData = {
          relationshipType: playerDiplomacy.getRelationshipEnum(localPlayerID),
          relationshipLevel: playerDiplomacy.getRelationshipLevel(localPlayerID),
          relationshipTooltip: Locale.compose(playerDiplomacy.getRelationshipLevelName(localPlayerID))
        };
        const playerData = this.createPlayerData(
          p,
          playerDiplomacy,
          localPlayerDiplomacy.hasMet(p.id),
          relationShipData
        );
        if (localPlayerDiplomacy.isAtWarWith(playerData.id)) {
          playerData.relationshipIcon = UI.getIcon("PLAYER_RELATIONSHIP_AT_WAR", "PLAYER_RELATIONSHIP");
        } else if (localPlayerDiplomacy.hasAllied(playerData.id)) {
          playerData.relationshipIcon = UI.getIcon("PLAYER_RELATIONSHIP_ALLIANCE", "PLAYER_RELATIONSHIP");
        }
        if (localPlayer.Culture?.getChosenIdeology() && GameInfo.Ideologies.lookup(localPlayer.Culture.getChosenIdeology()) && playerData.religionIdeology) {
          const ideology = GameInfo.Ideologies.lookup(localPlayer.Culture.getChosenIdeology());
          if (ideology?.IdeologyType && ideology.IdeologyType != playerData.religionIdeology.type) {
            playerData.religionIdeology.iconTint = "#944356" /* RivalReligionIdeology */;
          } else {
            playerData.religionIdeology.iconTint = "#579544" /* SameReligionIdeology */;
          }
        }
        this._playerData.push(playerData);
        this.updatePlayerWarSupport(p.id);
      }
    }
    this._alwaysShowYields = Configuration.getUser().getValue("RibbonStats");
    if (this._alwaysShowYields) {
      Audio.playSound("data-audio-focus", "audio-panel-diplo-ribbon");
    }
    this.onUpdate?.(this);
    this._eventNotificationRefresh.trigger();
  }
  getRibbonDisplayTypesFromUserOptions() {
    this._ribbonDisplayTypes = [];
    const showYieldsOption = UI.getOption(
      this.RIBBON_DISPLAY_OPTION_SET,
      this.RIBBON_DISPLAY_OPTION_TYPE,
      "RibbonShowYields"
    );
    if (showYieldsOption == null) {
      UI.setOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, "RibbonShowYields", 1);
      this._ribbonDisplayTypes.push(1 /* Yields */);
    } else if (showYieldsOption == 1) {
      this._ribbonDisplayTypes.push(1 /* Yields */);
    }
    const showScoresOption = UI.getOption(
      this.RIBBON_DISPLAY_OPTION_SET,
      this.RIBBON_DISPLAY_OPTION_TYPE,
      "RibbonShowScores"
    );
    if (showScoresOption == null) {
      UI.setOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, "RibbonShowScores", 0);
    } else if (showScoresOption == 1) {
      this._ribbonDisplayTypes.push(3 /* Scores */);
    }
    const showSizeOption = UI.getOption(
      this.RIBBON_DISPLAY_OPTION_SET,
      this.RIBBON_DISPLAY_OPTION_TYPE,
      "RibbonShowSize"
    );
    if (showSizeOption == null) {
      UI.setOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, "RibbonShowSize", 0);
    } else if (showSizeOption == 1) {
      this._ribbonDisplayTypes.push(2 /* Size */);
    }
  }
  updateDiploStatementPlayerData() {
    if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") && !DiplomacyManager.currentDiplomacyDialogData) {
      console.error("model-diplo-ribbon: Invalid currentDiplomacyDialogData!");
      return;
    }
    if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") && !DiplomacyManager.currentAllyWarData) {
      console.error("model-diplo-ribbon: Invalid currentAllyWarData!");
      return;
    }
    this._diploStatementPlayerData = [];
    const leftPlayerID = InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") ? DiplomacyManager.currentAllyWarData.targetPlayer : GameContext.localPlayerID;
    const rightPlayerID = InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") ? DiplomacyManager.currentAllyWarData.initialPlayer : InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") ? DiplomacyManager.currentProjectReactionRequest.initialPlayer : DiplomacyManager.currentDiplomacyDialogData.OtherPlayerID;
    const leftPlayer = Players.get(leftPlayerID);
    const rightPlayer = Players.get(rightPlayerID);
    if (!leftPlayer) {
      console.error(
        "model-diplo-ribbon: can't find PlayerLibrary for local observer: " + GameContext.localObserverID
      );
      return;
    }
    if (!rightPlayer) {
      console.error("model-diplo-ribbon: can't find PlayerLibrary for otherPlayerID: " + rightPlayerID);
      return;
    }
    const leftPlayerDiplomacy = leftPlayer.Diplomacy;
    if (!leftPlayerDiplomacy) {
      console.error("model-diplo-ribbon: Unable to find local player diplomacy, can't update player data!");
      return;
    }
    const rightPlayerDiplomacy = rightPlayer.Diplomacy;
    if (!rightPlayerDiplomacy) {
      console.error("model-diplo-ribbon: unable to find PlayerDiplomacy for player with id: " + rightPlayer.id);
      return;
    }
    const leftPlayerData = this.createPlayerData(leftPlayer, leftPlayerDiplomacy, true);
    if (leftPlayerData.religionIdeology) {
      leftPlayerData.religionIdeology.iconTint = this.getDiploReligionIdeologyIconTint(leftPlayerData);
    }
    this._diploStatementPlayerData.push(leftPlayerData);
    const rightPlayerData = this.createPlayerData(rightPlayer, rightPlayerDiplomacy, true);
    if (rightPlayerData.religionIdeology) {
      rightPlayerData.religionIdeology.iconTint = this.getDiploReligionIdeologyIconTint(rightPlayerData);
    }
    this._diploStatementPlayerData.push(rightPlayerData);
    this.updatePlayerWarSupport(rightPlayerData.id);
    if (this.onUpdate) {
      this.onUpdate(this);
    }
    this._eventNotificationRefresh.trigger();
  }
  get isExplorationAge() {
    return Game.age == Game.getHash("AGE_EXPLORATION");
  }
  get isModernAge() {
    return Game.age == Game.getHash("AGE_MODERN");
  }
  createPlayerData(player, playerDiplomacy, isKnownPlayer, relationshipData) {
    const isLocal = GameContext.localObserverID == player.id;
    const theSelectedPlayer = DiplomacyManager.selectedPlayerID != PlayerIds.NO_PLAYER ? Players.get(DiplomacyManager.selectedPlayerID) : null;
    if (theSelectedPlayer) {
      this.selected = player.id == DiplomacyManager.selectedPlayerID && InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") || isLocal && (theSelectedPlayer.isIndependent || theSelectedPlayer.isMinor);
      this.canClick = !this.selected && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") && isKnownPlayer || isLocal && (theSelectedPlayer?.isMinor || theSelectedPlayer?.isIndependent);
    } else {
      this.selected = player.id == DiplomacyManager.selectedPlayerID && InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB");
      this.canClick = !this.selected && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") && isKnownPlayer;
    }
    const leader = GameInfo.Leaders.lookup(player.leaderType);
    const leaderName = Locale.compose(leader == null ? "LOC_LEADER_NONE_NAME" : leader.Name);
    const pydtName = getPydtPlayerName(player.id);
    const civName = Locale.compose(player.name);
    const displayName = pydtName ?? civName;
    let name = !player.isHuman || isLocal ? displayName : !isKnownPlayer ? Locale.compose("LOC_DIPLOMACY_RIBBON_HUMAN_PLAYER_UNMET_NAME", displayName) : Locale.compose(
      "LOC_DIPLOMACY_RIBBON_HUMAN_PLAYER_MET_NAME",
      displayName,
      leaderName
    );
    const shortName = name;
    name += "[n]" + Locale.compose(player.civilizationName);
    let portraitContext = "";
    switch (relationshipData?.relationshipType) {
      case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE:
      case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNFRIENDLY:
        portraitContext = "LEADER_ANGRY";
        break;
      case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_FRIENDLY:
      case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HELPFUL:
        portraitContext = "LEADER_HAPPY";
        break;
      default:
        break;
    }
    const religion = player.Religion;
    const ideology = player.Culture?.getChosenIdeology();
    let religionIdeology = {
      name: "",
      type: "",
      icon: "",
      isIdeology: false
    };
    if (ideology && GameInfo.Ideologies.lookup(ideology) && this.isModernAge) {
      const idelogyInfo = GameInfo.Ideologies.lookup(ideology);
      religionIdeology.name = idelogyInfo?.Name || "";
      religionIdeology.type = idelogyInfo?.IdeologyType || "";
      religionIdeology.icon = UI.getIcon(religionIdeology.type);
      religionIdeology.isIdeology = true;
    } else if (religion && this.isExplorationAge) {
      religionIdeology.name = religion.getReligionName();
      const religionType = religion.getReligionType();
      const pReligion = GameInfo.Religions.lookup(religionType);
      if (pReligion) {
        religionIdeology.type = pReligion.ReligionType;
        religionIdeology.icon = UI.getIcon(pReligion.ReligionType, "PLAYER");
      }
    }
    if (!religionIdeology.name || !religionIdeology.icon) {
      religionIdeology = void 0;
    }
    const dataObj = {
      id: player.id,
      shortName,
      name,
      alwaysShow: isLocal || player.isHuman,
      leaderType: isKnownPlayer ? GameInfo.Leaders.lookup(player.leaderType)?.LeaderType ?? "UNKNOWN_LEADER" : "UNKNOWN_LEADER",
      portraitContext,
      civName: Locale.compose(player.civilizationFullName),
      civSymbol: "",
      civLine: "",
      primaryColor: UI.Player.getPrimaryColorValueAsString(player.id),
      secondaryColor: UI.Player.getSecondaryColorValueAsString(player.id),
      displayItems: [],
      yields: [],
      size: [],
      scores: [],
      canClick: this.canClick,
      selected: this.selected,
      isTurnActive: player.isTurnActive,
      dealIds: [],
      relationshipLevel: 0,
      relationshipIcon: "",
      relationshipTooltip: "",
      warSupport: 0,
      isAtWar: false,
      religionIdeology
    };
    if (GameContext.localObserverID == PlayerIds.NO_PLAYER) {
      console.error(`model-diplo-ribbon: Attempted to create player for a NOPLAYER.  Returning default object.`);
      return dataObj;
    }
    dataObj.civSymbol = Icon.getCivSymbolFromCivilizationType(player.civilizationType);
    dataObj.civLine = Icon.getCivLineFromCivilizationType(player.civilizationType);
    if (isKnownPlayer) {
      if (relationshipData && relationshipData.relationshipType != DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNKNOWN) {
        dataObj.relationshipIcon = UI.getIcon(
          DiplomacyManager.getRelationshipTypeString(relationshipData.relationshipType),
          "PLAYER_RELATIONSHIP"
        );
        dataObj.relationshipTooltip = relationshipData.relationshipTooltip;
      }
      dataObj.relationshipLevel = relationshipData?.relationshipLevel ?? 0;
      dataObj.dealIds = Game.DiplomacyDeals.getDealIds(player.id) ?? [];
      dataObj.yields = this.createPlayerYieldsData(player, isLocal);
      dataObj.size = this.createPlayerSizeData(player, isLocal);
      dataObj.scores = this.createPlayerScoreData(player);
      dataObj.displayItems = dataObj.yields.concat(dataObj.size.concat(dataObj.scores));
      dataObj.isAtWar = playerDiplomacy.isAtWarWith(GameContext.localPlayerID);
    }
    if (isLocal) {
      this._localPlayerStats = dataObj.displayItems;
    }
    return dataObj;
  }
  getPlayerTradeOpportunities(playerLibrary) {
    const playerId = GameContext.localObserverID;
    if (playerId == PlayerIds.NO_PLAYER) {
      return null;
    }
    const localPlayer = Players.get(playerId);
    if (!localPlayer) {
      console.error(
        `model-diplo-ribbon: getPlayerTradeOpportunities failed to retrieve Player with ID: ${playerId}`
      );
      return null;
    }
    const currentTradesWithCiv = localPlayer.Trade?.countPlayerTradeRoutesTo(playerLibrary.id) ?? 0;
    const maxTradeLimitWithCiv = localPlayer.Trade?.getTradeCapacityFromPlayer(playerLibrary.id) ?? 0;
    return {
      currentTradesWithCiv,
      maxTradeLimitWithCiv
    };
  }
  createPlayerYieldsData(playerLibrary, isLocal) {
    if (!this.shouldShowYieldType(1 /* Yields */)) {
      return [];
    }
    const yieldGold = playerLibrary.Stats?.getNetYield(YieldTypes.YIELD_GOLD) ?? 0;
    const yieldCulture = playerLibrary.Stats?.getNetYield(YieldTypes.YIELD_CULTURE) ?? 0;
    const yieldScience = playerLibrary.Stats?.getNetYield(YieldTypes.YIELD_SCIENCE) ?? 0;
    const yieldHappiness = playerLibrary.Stats?.getNetYield(YieldTypes.YIELD_HAPPINESS) ?? 0;
    const yieldDiplomacy = playerLibrary.Stats?.getNetYield(YieldTypes.YIELD_DIPLOMACY) ?? 0;
    const yieldSettlements = playerLibrary.Stats?.numSettlements ?? 0;
    const settlementCap = playerLibrary.Stats?.settlementCap ?? 0;
    const tradeInfo = this.getPlayerTradeOpportunities(playerLibrary);
    const yieldsData = [
      {
        type: "gold" /* Gold */,
        label: Locale.compose("LOC_YIELD_GOLD"),
        value: (yieldGold >= 0 ? "+" : "") + (yieldGold > 100 ? Math.trunc(yieldGold) : Math.trunc(yieldGold * 10) / 10),
        img: this.getImg("YIELD_GOLD", isLocal),
        details: "",
        rawValue: yieldGold,
        warningThreshold: Infinity
      },
      {
        type: "science" /* Science */,
        label: Locale.compose("LOC_YIELD_SCIENCE"),
        value: (yieldScience >= 0 ? "+" : "") + (yieldScience > 100 ? Math.trunc(yieldScience) : Math.trunc(yieldScience * 10) / 10),
        img: this.getImg("YIELD_SCIENCE", isLocal),
        details: "",
        rawValue: yieldScience,
        warningThreshold: Infinity
      },
      {
        type: "culture" /* Culture */,
        label: Locale.compose("LOC_YIELD_CULTURE"),
        value: (yieldCulture >= 0 ? "+" : "") + (yieldCulture > 100 ? Math.trunc(yieldCulture) : Math.trunc(yieldCulture * 10) / 10),
        img: this.getImg("YIELD_CULTURE", isLocal),
        details: "",
        rawValue: yieldCulture,
        warningThreshold: Infinity
      },
      {
        type: "happiness" /* Happiness */,
        label: Locale.compose("LOC_YIELD_HAPPINESS"),
        value: (yieldHappiness >= 0 ? "+" : "") + (yieldHappiness > 100 ? Math.trunc(yieldHappiness) : Math.trunc(yieldHappiness * 10) / 10),
        img: this.getImg("YIELD_HAPPINESS", isLocal),
        details: "",
        rawValue: yieldHappiness,
        warningThreshold: Infinity
      },
      {
        type: "diplomacy" /* Diplomacy */,
        label: Locale.compose("LOC_YIELD_DIPLOMACY"),
        value: (yieldDiplomacy >= 0 ? "+" : "") + (yieldDiplomacy > 100 ? Math.trunc(yieldDiplomacy) : Math.trunc(yieldDiplomacy * 10) / 10),
        img: this.getImg("YIELD_DIPLOMACY", isLocal),
        details: "",
        rawValue: yieldDiplomacy,
        warningThreshold: Infinity
      },
      {
        type: "settlements" /* Settlements */,
        label: Locale.compose("LOC_YIELD_MAX_CITIES"),
        value: yieldSettlements.toString() + "/" + settlementCap.toString(),
        img: this.getImg("YIELD_CITIES", isLocal),
        details: "",
        rawValue: yieldSettlements,
        warningThreshold: settlementCap
      },
      {
        type: "trade" /* Trade */,
        label: Locale.compose("LOC_YIELD_MAX_TRADE"),
        value: tradeInfo ? tradeInfo.currentTradesWithCiv + "/" + tradeInfo.maxTradeLimitWithCiv : "0/0",
        img: this.getImg("YIELD_TRADES", isLocal),
        details: "",
        rawValue: tradeInfo?.currentTradesWithCiv ?? 0,
        warningThreshold: tradeInfo?.maxTradeLimitWithCiv ?? 0
      }
    ];
    return yieldsData;
  }
  createPlayerSizeData(playerLibrary, isLocal) {
    if (!this.shouldShowYieldType(2 /* Size */)) {
      return [];
    }
    const sizeData = [
      {
        type: "property" /* Property */,
        label: "Cities",
        value: (playerLibrary.Stats?.numCities ?? 0).toFixed(0),
        img: this.getImg("YIELD_CITIES", isLocal),
        details: "",
        rawValue: playerLibrary.Stats?.numCities ?? 0,
        warningThreshold: Infinity
      },
      {
        type: "property" /* Property */,
        label: "Towns",
        value: (playerLibrary.Stats?.numTowns ?? 0).toFixed(0),
        img: this.getImg("YIELD_TOWNS", isLocal),
        details: "",
        rawValue: playerLibrary.Stats?.numTowns ?? 0,
        warningThreshold: Infinity
      },
      {
        type: "property" /* Property */,
        label: "Population",
        value: (playerLibrary.Stats?.totalPopulation ?? 0).toFixed(0),
        img: this.getImg("YIELD_POPULATION", isLocal),
        details: "",
        rawValue: playerLibrary.Stats?.totalPopulation ?? 0,
        warningThreshold: Infinity
      }
    ];
    return sizeData;
  }
  createPlayerScoreData(playerLibrary) {
    if (!this.shouldShowYieldType(3 /* Scores */)) {
      return [];
    }
    const scoresData = [];
    for (const playerScore of VictoryProgress.playerScores) {
      if (playerScore.playerID == playerLibrary.id) {
        const victoryDefinition = GameInfo.Victories.lookup(playerScore.victoryType);
        if (!victoryDefinition) {
          console.error(
            "model-diplo-ribbon: Unable to find victory definition for victoryType: " + playerScore.victoryType
          );
          continue;
        }
        scoresData.push({
          type: "victory" /* Victory */,
          label: Locale.compose(victoryDefinition.Name),
          value: playerScore.score.toString() + "/" + playerScore.scoreGoal.toString(),
          img: "<img src='" + playerScore.scoreIcon + "'>",
          details: "",
          rawValue: playerScore.score,
          warningThreshold: Infinity
        });
      }
    }
    scoresData.sort((a, b) => a.label.localeCompare(b.label));
    return scoresData;
  }
  getImg(label, isLocal) {
    return "<img src='" + UI.getIconURL(label, isLocal ? "YIELD" : "YIELD") + "'>";
  }
  queueUpdate() {
    if (this.updateQueued) return;
    this.updateQueued = true;
    requestAnimationFrame(() => {
      this.updateAll();
      this.updateQueued = false;
    });
  }
  // Queue a data model changed update
  queueDataModelChanged() {
    if (this.refDataModelChangedQueue == 0) {
      this.refDataModelChangedQueue = requestAnimationFrame(() => {
        for (const playerID of this.playerSizeUpdateQueue.queue) {
          this.updatePlayerSize(playerID);
        }
        this.playerSizeUpdateQueue.clear();
        VictoryProgress.update();
        for (const playerID of this.playerScoreUpdateQueue.queue) {
          this.updatePlayerScores(playerID);
        }
        this.playerScoreUpdateQueue.clear();
        for (const playerID of this.playerYieldUpdateQueue.queue) {
          this.updatePlayerYields(playerID);
        }
        this.playerYieldUpdateQueue.clear();
        for (const playerID of this.playerGlobalTokensUpdateQueue.queue) {
          this.updateGlobalTokens(playerID);
        }
        this.playerGlobalTokensUpdateQueue.clear();
        for (const playerId of this.playerWarUpdateQueue.queue) {
          this.updatePlayerWarSupport(playerId);
        }
        this.playerWarUpdateQueue.clear();
        this.refDataModelChangedQueue = 0;
        this._eventNotificationRefresh.trigger();
      });
    }
  }
  queueScoreUpdate(playerID) {
    if (this.playerScoreUpdateQueue.add(playerID)) {
      this.queueDataModelChanged();
    }
  }
  queueYieldUpdate(playerID) {
    if (this.playerYieldUpdateQueue.add(playerID)) {
      this.queueDataModelChanged();
    }
  }
  queueSizeUpdate(playerID) {
    if (this.playerSizeUpdateQueue.add(playerID)) {
      this.queueDataModelChanged();
    }
  }
  queueGlobalTokensUpdate(playerID) {
    if (this.playerGlobalTokensUpdateQueue.add(playerID)) {
      this.queueDataModelChanged();
    }
  }
  shouldShowYieldType(ribbonDisplayType) {
    return this._ribbonDisplayTypes.includes(ribbonDisplayType);
  }
  onInterfaceModeChanged(event) {
    if (event?.detail?.newMode == "INTERFACEMODE_DIPLOMACY_HUB") {
      this.previousDisplayTypes = this._ribbonDisplayTypes;
      this._ribbonDisplayTypes = [];
      this.queueUpdate();
    } else if (event?.detail?.newMode == "INTERFACEMODE_DIPLOMACY_DIALOG" || event?.detail?.newMode == "INTERFACEMODE_CALL_TO_ARMS" || event?.detail?.newMode == "INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") {
      if (event?.detail?.prevMode != "INTERFACEMODE_DIPLOMACY_HUB") {
        this.previousDisplayTypes = this._ribbonDisplayTypes;
        this._ribbonDisplayTypes = [];
      }
      this.updateDiploStatementPlayerData();
    } else if (event?.detail?.prevMode == "INTERFACEMODE_DIPLOMACY_HUB" || event?.detail?.prevMode == "INTERFACEMODE_DIPLOMACY_DIALOG" || event?.detail?.prevMode == "INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") {
      this._ribbonDisplayTypes = this.previousDisplayTypes;
      this.queueUpdate();
    }
  }
  onPolicyChanged(data) {
    if (this.playerData.some((o) => o.id == data.player)) {
      this.queueYieldUpdate(data.player);
    }
  }
  onPlayerYieldChanged(data) {
    if (this.playerData.some((o) => o.id == data.player)) {
      this.queueYieldUpdate(data.player);
    }
  }
  onNarrativeChoiceMade(data) {
    if (this.playerData.some((o) => o.id == data.player)) {
      this.queueYieldUpdate(data.player);
    }
  }
  onCultureYieldChanged(data) {
    if (this.playerData.some((o) => o.id == data.player)) {
      this.queueYieldUpdate(data.player);
    }
  }
  onResearchYieldChanged(data) {
    if (this.playerData.some((o) => o.id == data.player)) {
      this.queueYieldUpdate(data.player);
    }
  }
  onTreasuryChanged(data) {
    if (this.playerData.some((o) => o.id == data.player)) {
      this.queueYieldUpdate(data.player);
    }
  }
  onDiplomacyTreasuryChanged(data) {
    if (this.playerData.some((o) => o.id == data.player)) {
      this.queueYieldUpdate(data.player);
    }
  }
  onCityYieldChanged(data) {
    if (this.playerData.some((o) => o.id == data.cityID.owner)) {
      this.queueYieldUpdate(data.cityID.owner);
    }
  }
  onPlayerSettlementCapChanged(data) {
    this.queueYieldUpdate(data.player);
  }
  onGlobalTokensChanged(data) {
    if (this.playerData.some((o) => o.id == data.owningPlayer)) {
      this.queueGlobalTokensUpdate(data.owningPlayer);
    }
  }
  onRelationshipStatusChanged(data) {
    const localObserverID = GameContext.localObserverID;
    if (data.player1 == localObserverID) {
      this.queueYieldUpdate(data.player1);
    } else if (data.player2 == localObserverID) {
      this.queueYieldUpdate(data.player2);
    }
  }
  onWonderCompleted(data) {
    if (this.playerData.some((o) => o.id == data.constructible.owner)) {
      this.queueScoreUpdate(data.constructible.owner);
    }
  }
  onPlayerAgeTransitionComplete(data) {
    if (this.playerData.some((o) => o.id == data.player)) {
      this.queueYieldUpdate(data.player);
    }
  }
  onDiplomacyWarUpdate(data, isWar) {
    const actingPlayerIndex = this.playerData.findIndex((o) => o.id == data.actingPlayer);
    const reactingPlayerIndex = this.playerData.findIndex((o) => o.id == data.reactingPlayer);
    if (actingPlayerIndex && reactingPlayerIndex) {
      if (data.reactingPlayer == GameContext.localPlayerID) {
        this.updatePlayerWarSupport(data.actingPlayer);
        const actingPlayer = this._playerData[actingPlayerIndex];
        if (actingPlayer) {
          if (isWar) {
            actingPlayer.relationshipIcon = UI.getIcon("PLAYER_RELATIONSHIP_AT_WAR", "PLAYER_RELATIONSHIP");
          } else {
            const localPlayerDiplomacy = Players.get(
              GameContext.localPlayerID
            )?.Diplomacy;
            if (localPlayerDiplomacy === void 0) {
              console.error(
                "model-diplo-ribbon: Updating war status, but can't find local player diplomacy object"
              );
              return;
            }
            const relationship = localPlayerDiplomacy.getRelationshipEnum(actingPlayer.id);
            if (relationship == DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNKNOWN) {
              actingPlayer.relationshipIcon = "";
            } else {
              actingPlayer.relationshipIcon = UI.getIcon(
                DiplomacyManager.getRelationshipTypeString(relationship),
                "PLAYER_RELATIONSHIP"
              );
            }
          }
          actingPlayer.isAtWar = isWar;
        } else {
          console.error(
            "model-diplo-ribbon: Unable to find player with ID: " + data.actingPlayer + "! Can't update diplo ribbon."
          );
          return;
        }
      } else if (data.actingPlayer == GameContext.localPlayerID) {
        this.updatePlayerWarSupport(data.reactingPlayer);
        const reactingPlayer = this._playerData[reactingPlayerIndex];
        if (reactingPlayer) {
          if (isWar) {
            reactingPlayer.relationshipIcon = UI.getIcon(
              "PLAYER_RELATIONSHIP_AT_WAR",
              "PLAYER_RELATIONSHIP"
            );
          } else {
            const localPlayerDiplomacy = Players.get(
              GameContext.localPlayerID
            )?.Diplomacy;
            if (localPlayerDiplomacy === void 0) {
              console.error(
                "model-diplo-ribbon: Updating war status, but can't find local player diplomacy object"
              );
              return;
            }
            const relationship = localPlayerDiplomacy.getRelationshipEnum(reactingPlayer.id);
            if (relationship == DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNKNOWN) {
              reactingPlayer.relationshipIcon = "";
            } else {
              reactingPlayer.relationshipIcon = UI.getIcon(
                DiplomacyManager.getRelationshipTypeString(relationship),
                "PLAYER_RELATIONSHIP"
              );
            }
          }
          reactingPlayer.isAtWar = isWar;
        } else {
          console.error(
            "model-diplo-ribbon: Unable to find player with ID: " + data.reactingPlayer + "! Can't update diplo ribbon."
          );
          return;
        }
      }
    }
    this._eventNotificationRefresh.trigger();
  }
  onDiplomacyDeclareWar(data) {
    this.onDiplomacyWarUpdate(data, true);
  }
  onDiplomacyMakePeace(data) {
    this.onDiplomacyWarUpdate(data, false);
  }
  onDiplomacyMeet(data) {
    let otherPlayer = null;
    const localObserverID = GameContext.localObserverID;
    this.updateAll();
    if (data.player1 == localObserverID) {
      otherPlayer = Players.get(data.player2);
    } else if (data.player2 == localObserverID) {
      otherPlayer = Players.get(data.player1);
    }
    if (!otherPlayer) {
      return;
    }
    for (const playerData of this._playerData) {
      if (playerData.id == otherPlayer.id) {
        return;
      }
    }
    if (!otherPlayer?.isMajor) {
      console.error("Not a Major player.  Probably an Independent turning into a city-state.");
      return;
    }
    const diplomacy = otherPlayer.Diplomacy;
    if (diplomacy) {
      const relationShipData = {
        relationshipType: diplomacy.getRelationshipEnum(localObserverID),
        relationshipLevel: diplomacy.getRelationshipLevel(localObserverID),
        relationshipTooltip: Locale.compose(diplomacy.getRelationshipLevelName(localObserverID))
      };
      const otherPlayerData = this.createPlayerData(otherPlayer, diplomacy, true, relationShipData);
      this._playerData.splice(otherPlayerData.id, 0, otherPlayerData);
    } else {
      console.error("model-diplo-ribbon: No Diplomacy object for player, not updating diplo ribbon.");
      return;
    }
    this._eventNotificationRefresh.trigger();
  }
  onAttributeNodeCompleted(data) {
    if (data.player != GameContext.localPlayerID) {
      return;
    }
    this.queueYieldUpdate(data.player);
  }
  updatePlayerScores(playerID) {
    const index = this.playerData.findIndex((o) => o.id == playerID);
    if (index == -1) {
      return;
    }
    const playerLibrary = Players.get(playerID);
    if (!playerLibrary) {
      console.error(
        "model-diplo-ribbon: Unable to find player with ID: " + playerID + "! Aborting update of player's scores!"
      );
      return;
    }
    this._playerData[index].scores = this.createPlayerScoreData(playerLibrary);
    this._playerData[index].displayItems = this._playerData[index].yields.concat(
      this._playerData[index].size.concat(this._playerData[index].scores)
    );
    if (playerID == GameContext.localPlayerID) {
      this._localPlayerStats = this._playerData[index].displayItems;
    }
    if (this.onUpdate) {
      this.onUpdate(this);
    }
  }
  updatePlayerYields(playerID) {
    const index = this.playerData.findIndex((o) => o.id == playerID);
    if (index == -1) {
      return;
    }
    const playerLibrary = Players.get(playerID);
    if (!playerLibrary) {
      console.error(
        "model-diplo-ribbon: Unable to find player with ID: " + playerID + "! Aborting update of player's yields!"
      );
      return;
    }
    if (!playerLibrary.Diplomacy) {
      console.error(
        "model-diplo-ribbon: Unable to find player diplomacy for player with ID: " + playerID + "! Aborting update of player's yields!"
      );
      return;
    }
    const isLocal = playerID == GameContext.localPlayerID;
    this._playerData[index].yields = this.createPlayerYieldsData(playerLibrary, isLocal);
    this._playerData[index].displayItems = this._playerData[index].yields.concat(
      this._playerData[index].size.concat(this._playerData[index].scores)
    );
    if (isLocal) {
      this._localPlayerStats = this._playerData[index].displayItems;
    }
    if (this.onUpdate) {
      this.onUpdate(this);
    }
  }
  updatePlayerSize(playerID) {
    const index = this.playerData.findIndex((o) => o.id == playerID);
    if (index == -1) {
      return;
    }
    const playerLibrary = Players.get(playerID);
    if (!playerLibrary) {
      console.error(
        "model-diplo-ribbon: Unable to find player with ID: " + playerID + "! Aborting update of player's yields!"
      );
      return;
    }
    if (!playerLibrary.Diplomacy) {
      console.error(
        "model-diplo-ribbon: Unable to find player diplomacy for player with ID: " + playerID + "! Aborting update of player's yields!"
      );
      return;
    }
    const isLocal = playerID == GameContext.localPlayerID;
    this._playerData[index].size = this.createPlayerSizeData(playerLibrary, isLocal);
    this._playerData[index].displayItems = this._playerData[index].yields.concat(
      this._playerData[index].size.concat(this._playerData[index].scores)
    );
    if (isLocal) {
      this._localPlayerStats = this._playerData[index].displayItems;
    }
    if (this.onUpdate) {
      this.onUpdate(this);
    }
  }
  updateGlobalTokens(playerID) {
    this.queueYieldUpdate(playerID);
  }
  onCityPopulationChanged(data) {
    if (this.playerData.some((o) => o.id == data.cityID.owner)) {
      this.queueSizeUpdate(data.cityID.owner);
    }
  }
  onLocalPlayerChanged(_data) {
    this.updateAll();
  }
  onPlayerPostDisconnected(data) {
    if (this.playerData.some((o) => o.id == data.data)) {
      this.queueUpdate();
    }
    this._eventNotificationRefresh.trigger();
  }
  onPlayerInfoChanged(data) {
    if (!this.playerData.some((o) => o.id == data.data)) {
      return;
    }
    const player = Players.get(data.data);
    if (player) {
      this.queueUpdate();
      this._eventNotificationRefresh.trigger();
    }
  }
  /**
   * In MP game it means someone left and rejoined in a new slot.
   */
  onPlayersSwapped() {
    this.queueUpdate();
  }
  onPlayerTurnActivated(data) {
    const index = this.playerData.findIndex((o) => o.id == data.player);
    if (index == PlayerIds.NO_PLAYER) {
      return;
    }
    this._playerData[index].isTurnActive = true;
    if (data.player == GameContext.localObserverID) {
      const player = Players.get(data.player);
      if (!player || !player.Diplomacy) {
        console.error(
          "mode-diplo-ribbon: Unable to retrieve player diplomacy object during turn start for local player"
        );
        if (this.onUpdate) {
          this.onUpdate(this);
        }
        return;
      }
    }
    if (this.onUpdate) {
      this.onUpdate(this);
    }
    this._eventNotificationRefresh.trigger();
  }
  onPlayerTurnDeactivated(data) {
    const index = this.playerData.findIndex((o) => o.id == data.player);
    if (index == -1) {
      return;
    }
    setTimeout(() => {
      this._playerData[index].isTurnActive = false;
    }, 250);
    if (this.onUpdate) {
      this.onUpdate(this);
    }
  }
  onAutoplayEnd() {
    this.queueUpdate();
  }
  onAutoplayStarted() {
    this._playerData = [];
    const localObserverID = GameContext.localObserverID;
    if (localObserverID === PlayerIds.NO_PLAYER || localObserverID === PlayerIds.OBSERVER_ID) {
      const PlayersIDs = Players.getAlive();
      PlayersIDs.forEach((player) => {
        if (player.Diplomacy && player.isMajor) {
          const otherPlayerData = this.createPlayerData(player, player.Diplomacy, true);
          this._playerData.push(otherPlayerData);
        }
      });
    }
    this.queueUpdate();
  }
  onSupportChanged(data) {
    const eventHeader = Game.Diplomacy.getDiplomaticEventData(data.actionID);
    this.checkForSanctionAndWarUpdate(eventHeader);
    this._eventNotificationRefresh.trigger();
  }
  onActionCanceled(data) {
    const eventHeader = Game.Diplomacy.getDiplomaticEventData(data.actionID);
    this.checkForSanctionAndWarUpdate(eventHeader);
    this._eventNotificationRefresh.trigger();
  }
  checkForSanctionAndWarUpdate(eventHeader) {
    if (eventHeader.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR) {
      if (eventHeader.initialPlayer == GameContext.localPlayerID) {
        this.queueWarUpdate(eventHeader.targetPlayer);
      } else if (eventHeader.targetPlayer == GameContext.localPlayerID) {
        this.queueWarUpdate(eventHeader.initialPlayer);
      }
      return;
    }
    if (eventHeader.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_SANCTION && eventHeader.targetPlayer == GameContext.localPlayerID) {
      this.queueSanctionUpdate(eventHeader.initialPlayer);
    }
  }
  queueWarUpdate(playerID) {
    if (this.playerWarUpdateQueue.add(playerID)) {
      this.queueDataModelChanged();
      return;
    }
  }
  queueSanctionUpdate(playerID) {
    if (this.playerSanctionUpdateQueue.add(playerID)) {
      this.queueDataModelChanged();
      return;
    }
  }
  updatePlayerWarSupport(playerID) {
    const index = this.playerData.findIndex((o) => o.id == playerID);
    if (index == -1) {
      return;
    }
    let warID = -1;
    const jointEvents = Game.Diplomacy.getJointEvents(
      GameContext.localPlayerID,
      playerID,
      false
    );
    if (jointEvents.length > 0) {
      jointEvents.forEach((jointEvent) => {
        if (jointEvent.actionTypeName == "DIPLOMACY_ACTION_DECLARE_WAR") {
          warID = jointEvent.uniqueID;
        }
      });
    }
    if (warID == -1) {
      this.playerData[index].warSupport = 0;
      return;
    }
    const warEventHeader = Game.Diplomacy.getDiplomaticEventData(warID);
    const warData = Game.Diplomacy.getProjectDataForUI(
      warEventHeader.initialPlayer,
      -1,
      DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET,
      DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP,
      -1,
      DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET
    ).find((project) => project.actionID == warID);
    if (warData == void 0) {
      console.error(
        "model-diplo-ribbon: Attempting to get war data, but there is no valid DiplomaticProjectUIData for the war diplomatic event"
      );
      this.playerData[index].warSupport = 0;
      return;
    }
    if (warEventHeader.initialPlayer == GameContext.localPlayerID) {
      this.playerData[index].warSupport = Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(warEventHeader.uniqueID).length - Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(warEventHeader.uniqueID).length;
    } else {
      this.playerData[index].warSupport = Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(warEventHeader.uniqueID).length - Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(warEventHeader.uniqueID).length;
    }
  }
  effectUsedListener() {
    if (this.onUpdate) {
      this.onUpdate(this);
    }
  }
  getDiploReligionIdeologyIconTint(playerData) {
    if (!playerData.religionIdeology) {
      return;
    }
    const localPlayer = Players.get(GameContext.localPlayerID);
    if (!localPlayer) {
      console.error(
        `model-diplo-ribbon: getDiploReligionIdeologyIconTint failed to retrieve Player with id: ${GameContext.localPlayerID}`
      );
      return;
    }
    if (localPlayer.id == playerData.id) {
      return "#579544" /* SameReligionIdeology */;
    } else if (localPlayer.Culture) {
      const ideology = GameInfo.Ideologies.lookup(localPlayer.Culture.getChosenIdeology());
      if (ideology?.IdeologyType && ideology.IdeologyType != playerData.religionIdeology.type) {
        return "#944356" /* RivalReligionIdeology */;
      }
    }
  }
}
const DiploRibbonData = DiploRibbonModel.getInstance();
engine.whenReady.then(() => {
  const updateModel = () => {
    engine.updateWholeModel(DiploRibbonData);
  };
  engine.createJSModel("g_DiploRibbon", DiploRibbonData);
  DiploRibbonData.updateCallback = updateModel;
});

export { DiploRibbonData, RibbonDisplayType, RibbonStatsToggleStatus, RibbonYieldType, UpdateDiploRibbonEvent, UpdateDiploRibbonEventName };
//# sourceMappingURL=model-diplo-ribbon.js.map
