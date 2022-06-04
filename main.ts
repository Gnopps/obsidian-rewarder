import {
  App,
  debounce,
  Editor,
  MarkdownView,
  Modal,
  moment,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  ToggleComponent,
} from "obsidian";
import { exit } from "process";

import { appHasDailyNotesPluginLoaded } from "obsidian-daily-notes-interface";
import {
  getDailyNote,
  createDailyNote,
  getAllDailyNotes,
} from "obsidian-daily-notes-interface";

import { ObsidianRewarderSettings, DEFAULT_SETTINGS } from "./settings";

// Add "batch-mode" where there is only call-out when award won and then all awards are stored in daily-note or batch file

export async function getDailyNoteFile(): Promise<TFile> {
  const file = getDailyNote(moment(), getAllDailyNotes());

  if (!file) {
    return await createDailyNote(moment());
  }

  return file;
}

export default class ObsidianRewarder extends Plugin {
  settings: ObsidianRewarderSettings;

  functionReference; // To be able to remove eventlistener: https://stackoverflow.com/questions/65379045/remove-event-listener-with-an-anonymous-function-with-a-local-scope-variable

  eventFunction = function (self) {
    // Taken from here: https://stackoverflow.com/questions/256754/how-to-pass-arguments-to-addeventlistener-listener-function
    return function curriedFunction(evt) {
      if (evt.target.checked) {
        self.handleReward();
      }
    };
  };

  async handleReward() {
    let arrayOfCleanedRewards = [];
    let chosenReward;
    let rewardsByOccurrence = {};

    // Read contents of rewards file
    const { vault } = this.app;
    let rewardsFile = vault.getAbstractFileByPath(this.settings.rewardsFile);

    let contents;

    try {
      contents = await this.app.vault.read(rewardsFile);
    } catch {
      new Notice(
        "Obsidian Rewards couldn't open the rewards file.\nPlease check the path in the settings."
      );
      return;
    }
    var char = "\n";
    let x = 0;
    let y = 0;
    let dirtyRewards = [];

    while ((y = contents.indexOf(char, x)) !== -1) {
      dirtyRewards.push(contents.substring(x, y));
      x = y + 1;
    }
    dirtyRewards.push(contents.substring(x));

    // Create rewards with metadata
    for (let i = 0; i < dirtyRewards.length; i++) {
      const dirtyReward = dirtyRewards[i];

      let rewardsLeft = 1;
      let occurrence = "";
      let rewardName = "";
      let imageLink = "";
      let metadataValues = [];
      let metadataStart = [];
      let metadataEnd = [];
      let dirtyRewardWithPartialMetadataStripped = dirtyReward;

      for (let i = 0; i < 4; i++) {
        // Extract metadata
        metadataStart[i] = dirtyRewardWithPartialMetadataStripped.indexOf(
          this.settings.escapeCharacterBegin
        );
        metadataEnd[i] = dirtyRewardWithPartialMetadataStripped.indexOf(
          this.settings.escapeCharacterEnd,
          metadataStart[i]
        );
        if (metadataStart[i] < 0) {
          // If first metadata not found then put default values
          occurrence = this.settings.occurrenceTypes[0].label;
          rewardsLeft = 1;
          rewardName = dirtyRewardWithPartialMetadataStripped;
          break;
        } else {
          metadataValues[i] = dirtyRewardWithPartialMetadataStripped.substring(
            metadataStart[i] + 1,
            metadataEnd[i]
          );
        }
        if (metadataValues[i].substring(0, 8) === "file:///") {
          imageLink = metadataValues[i];
        } else if (/^\d+$/.test(metadataValues[i])) {
          rewardsLeft = metadataValues[i];
        } else {
          occurrence = metadataValues[i];
        }
        dirtyRewardWithPartialMetadataStripped =
          dirtyRewardWithPartialMetadataStripped.replace(
            this.settings.escapeCharacterBegin +
              metadataValues[i] +
              this.settings.escapeCharacterEnd,
            ""
          );
      }
      const rewardObject = {
        dirtyReward: dirtyRewards[i],
        rewardName: rewardName.replace(/\n|\t|\r|- |\* |\+ /g, "").trim(),
        rewardsLeft: rewardsLeft,
        occurrence: occurrence,
        imageLink: imageLink,
      };
      if (rewardObject.rewardsLeft > 0) {
        // Only add reward if there is inventory
        arrayOfCleanedRewards.push(rewardObject);

        if (rewardsByOccurrence.hasOwnProperty(occurrence)) {
          rewardsByOccurrence[occurrence].push(rewardObject);
        } else {
          rewardsByOccurrence[occurrence] = [];
          rewardsByOccurrence[occurrence].push(rewardObject);
        }
      }
    }

    // Check what reward types are active and how many of each, for chance calculation

    let foundOccurenceTypes = {
      [this.settings.occurrenceTypes[0].label]: 0,
      [this.settings.occurrenceTypes[1].label]: 0,
      [this.settings.occurrenceTypes[2].label]: 0,
    };

    for (let i = 0; i < arrayOfCleanedRewards.length; i++) {
      foundOccurenceTypes[arrayOfCleanedRewards[i].occurrence] =
        foundOccurenceTypes[arrayOfCleanedRewards[i].occurrence] + 1;
    }

    // See if we won a reward

    let sumOfOccurrences = 0;

    for (let i = 0; i < this.settings.occurrenceTypes.length; i++) {
      if (foundOccurenceTypes[this.settings.occurrenceTypes[i].label] > 0) {
        sumOfOccurrences += this.settings.occurrenceTypes[i].value;
      }
    }
    if (sumOfOccurrences > 100) {
      // Need to convert so total is no more than 100%
      const divideByThisToGetTo100 = sumOfOccurrences / 100;

      for (
        let i = 0;
        i < Object.keys(this.settings.occurrenceTypes).length;
        i++
      ) {
        this.settings.occurrenceTypes[i].value =
          this.settings.occurrenceTypes[i].value / divideByThisToGetTo100;
      }
      sumOfOccurrences = this.settings.occurrenceTypes.reduce(
        (partialSum, a) => partialSum + a,
        0
      );
    }

    sumOfOccurrences = sumOfOccurrences * 10; // To skip decimal numbers

    const lotteryNumber = Math.floor(Math.random() * 1000);

    if (lotteryNumber > sumOfOccurrences) {
      // Did not get a reward
      return;
    }

    // Get the reward

    const objectOfOccurrences = {};
    for (let i = 0; i < this.settings.occurrenceTypes.length; i++) {
      objectOfOccurrences[this.settings.occurrenceTypes[i].label] =
        this.settings.occurrenceTypes[i].value;
    }
    const arrayOfOccurrences = Object.keys(foundOccurenceTypes);

    let checkedProbabilities = 0;

    for (let i = 0; i < arrayOfOccurrences.length; i++) {
      if (
        foundOccurenceTypes[arrayOfOccurrences[i]] > 0 &&
        lotteryNumber <
          objectOfOccurrences[arrayOfOccurrences[i]] * 10 + checkedProbabilities
      ) {
        // Choose a reward among the ones within the same occurrence category
        const randomNumberToChooseRewardWithinOccurence = Math.floor(
          Math.random() * foundOccurenceTypes[arrayOfOccurrences[i]]
        );
        chosenReward =
          rewardsByOccurrence[arrayOfOccurrences[i]][
            randomNumberToChooseRewardWithinOccurence
          ];
        break;
      }
      checkedProbabilities =
        checkedProbabilities + objectOfOccurrences[arrayOfOccurrences[i]] * 10;
    }

    // Show notification

    if (this.settings.showModal) {
      new CongratulationsModal(
        this.app,
        chosenReward,
        this.settings.useAsInspirational
      ).open();
    } else {
      const stringToShow = this.settings.useAsInspirational
        ? chosenReward.rewardName
        : "🎈 🎉 🎈 Congratulations! 🎈 🎉 🎈\nBy completing this task you won this reward:\n " +
          "⭐ " +
          chosenReward.rewardName +
          " ⭐";
      new Notice(stringToShow);
    }

    // Substract reward quantity

    let adjustedReward;
    if (chosenReward.rewardsLeft) {
      let newRewardsLeft = chosenReward.rewardsLeft - 1;
      adjustedReward = chosenReward.dirtyReward.replace(
        this.settings.escapeCharacterBegin +
          chosenReward.rewardsLeft +
          this.settings.escapeCharacterEnd,
        this.settings.escapeCharacterBegin +
          newRewardsLeft +
          this.settings.escapeCharacterEnd
      );
    } else {
      adjustedReward = chosenReward.dirtyReward;
    }

    // Update rewards file

    let newContents = contents.replace(
      chosenReward.dirtyReward,
      adjustedReward
    );
    try {
      vault.modify(rewardsFile, newContents);
    } catch {
      new Notice("Obsidian Rewards couldn't modify the rewards file.");
    }

    // Log to daily note, partly taken from https://github.com/kzhovn/statusbar-pomo-obsidian/blob/master/src/timer.ts

    const logText = "Earned reward: " + chosenReward.rewardName;

    if (
      this.settings.saveToDaily === true &&
      appHasDailyNotesPluginLoaded() === true
    ) {
      let file = (await getDailyNoteFile()).path;
      //from Note Refactor plugin by James Lynch, https://github.com/lynchjames/note-refactor-obsidian/blob/80c1a23a1352b5d22c70f1b1d915b4e0a1b2b33f/src/obsidian-file.ts#L69

      let existingContent = await this.app.vault.adapter.read(file);
      if (existingContent.length > 0) {
        existingContent = existingContent + "\r";
      }
      await this.app.vault.adapter.write(file, existingContent + logText);
    }
  }

  async createSampleNote(self) {
    // Creates a sample note of rewards using the user's settings
    let folder = app.fileManager.getNewFileParent("");
    const createdNote = await app.fileManager.createNewMarkdownFile(
      folder,
      "Rewards.md"
    );
    const sampleContentsForNote =
      "- Have a cup of tea" +
      "\n- Watch an episode of favourite series " +
      self.settings.escapeCharacterBegin +
      self.settings.occurrenceTypes[1].label +
      self.settings.escapeCharacterEnd +
      " " +
      self.settings.escapeCharacterBegin +
      "20" +
      self.settings.escapeCharacterEnd +
      "\n- Knit for 15 minutes " +
      self.settings.escapeCharacterBegin +
      self.settings.occurrenceTypes[1].label +
      self.settings.escapeCharacterEnd +
      " " +
      "\n- Open the birthday present champagne bottle " +
      self.settings.escapeCharacterBegin +
      self.settings.occurrenceTypes[2].label +
      self.settings.escapeCharacterEnd +
      " " +
      self.settings.escapeCharacterBegin +
      "1" +
      self.settings.escapeCharacterEnd;
    app.vault.modify(createdNote, sampleContentsForNote);
    new Notice("Created file " + createdNote.path);
  }

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new ObsidianRewarderSettings(this.app, this));

    this.addCommand({
      id: "create-sample-rewards-note",
      name: "Create sample rewards note",
      callback: () => {
        this.createSampleNote(this);
      },
    });

    window.addEventListener(
      // Adding like this instead of registerDomEvent as can't use the "capture"-option with it. Capture needed as Obsidian-tasks stops propagation.
      "click",
      (this.functionReference = this.eventFunction(this)),
      {
        capture: true,
      }
    );
  }

  async onunload(): void {
    // Remove event listeners
    window.removeEventListener("click", this.functionReference, {
      capture: true,
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class CongratulationsModal extends Modal {
  constructor(
    app: App,
    public rewardObject: any,
    public useAsInspirational: boolean
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl, containerEl } = this;
    const modal = contentEl.createEl("div", { cls: "rewarderModal" });
    if (this.useAsInspirational) {
      modal.createEl("h1", {
        text: this.rewardObject.rewardName,
      });
    } else {
      modal.createEl("h2", {
        text: "Congratulations!",
      });
      modal.createEl("p", {
        text: "By completing this task you won this reward:",
      });
      modal.createEl("h1", {
        text: "⭐ " + this.rewardObject.rewardName + " ⭐",
        cls: "rewardName",
      });
      modal.createEl("h2", {
        text: "🎈 🎉 🎈",
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
