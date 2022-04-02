import {
	App,
	debounce,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	ToggleComponent,
} from "obsidian";
import { exit } from "process";

import { ObsidianRewarderSettings, DEFAULT_SETTINGS } from "./settings";

// Add "batch-mode" where there is only call-out when award won and then all awards are stored in daily-note or batch file

export default class ObsidianRewarder extends Plugin {
	settings: ObsidianRewarderSettings;

	observer;

	eventFunction = function (self) {
		// Taken from here: https://stackoverflow.com/questions/256754/how-to-pass-arguments-to-addeventlistener-listener-function
		return function curried_func(evt) {
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
		let rewardsFile = vault.getAbstractFileByPath("Rewards.md");
		const contents = await this.app.vault.read(rewardsFile);
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
			let firstMetadataValue;
			let secondMetadataValue;
			let dirtyRewardWithoutFirstMetadata = "";

			let firstMetadataStart = dirtyReward.indexOf(
				this.settings.escapeCharacterBegin
			);
			let firstMetadataEnd = dirtyReward.indexOf(
				this.settings.escapeCharacterEnd,
				firstMetadataStart
			);

			if (firstMetadataEnd < 0) {
				occurrence = this.settings.occurrenceTypes[0].label; // If first metadata not found then put default values
				rewardsLeft = 1;
				rewardName = dirtyReward;
			} else {
				firstMetadataValue = dirtyReward.substring(
					firstMetadataStart + 1,
					firstMetadataEnd
				);
				if (/^\d+$/.test(firstMetadataValue)) {
					rewardsLeft = firstMetadataValue;
				} else {
					occurrence = firstMetadataValue;
				}

				dirtyRewardWithoutFirstMetadata = dirtyReward.replace(
					this.settings.escapeCharacterBegin +
						firstMetadataValue +
						this.settings.escapeCharacterEnd,
					""
				);

				let secondMetadataStart =
					dirtyRewardWithoutFirstMetadata.indexOf(
						this.settings.escapeCharacterBegin
					);
				let secondMetadataEnd = dirtyRewardWithoutFirstMetadata.indexOf(
					this.settings.escapeCharacterEnd,
					secondMetadataStart
				);

				if (secondMetadataEnd < 0) {
					if (rewardsLeft) {
						// If second metadata not found then put default value in the one that is left
						occurrence = this.settings.occurrenceTypes[0].label;
					} else {
						rewardsLeft = 1;
					}
					rewardName = dirtyRewardWithoutFirstMetadata;
				} else {
					secondMetadataValue =
						dirtyRewardWithoutFirstMetadata.substring(
							secondMetadataStart + 1,
							secondMetadataEnd
						);

					if (/^\d+$/.test(secondMetadataValue)) {
						rewardsLeft = secondMetadataValue;
					} else {
						occurrence = secondMetadataValue;
					}

					rewardName = dirtyRewardWithoutFirstMetadata.replace(
						this.settings.escapeCharacterBegin +
							secondMetadataValue +
							this.settings.escapeCharacterEnd,
						""
					);
				}
			}
			const rewardObject = {
				dirtyReward: dirtyRewards[i],
				rewardName: rewardName
					.replace(/\n|\t|\r|- |\* |\+ /g, "")
					.trim(),
				rewardsLeft: rewardsLeft,
				occurrence: occurrence,
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
			if (
				foundOccurenceTypes[this.settings.occurrenceTypes[i].label] > 0
			) {
				sumOfOccurrences += this.settings.occurrenceTypes[i].value;
			}
		}
		if (sumOfOccurrences > 100) {
			// Need to convert so total is no more than 100%
			const divideByThisToGetTo100 = sumOfOccurrences / 100;

			for (
				let i = 0;
				i < Object.keys(this.plugin.settings.occurrenceTypes).length;
				i++
			) {
				this.settings.occurrenceTypes[i].value =
					this.settings.occurrenceTypes[i].value /
					divideByThisToGetTo100;
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
					objectOfOccurrences[arrayOfOccurrences[i]] * 10 +
						checkedProbabilities
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
				checkedProbabilities +
				objectOfOccurrences[arrayOfOccurrences[i]] * 10;
		}

		// Show notification
		if (this.settings.showModal) {
			new CongratulationsModal(this.app, chosenReward).open();
		} else {
			const stringToShow =
				"🎈 🎉 🎈 Congratulations! 🎈 🎉 🎈\nBy completing this task you won this reward:\n " +
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
		vault.modify(rewardsFile, newContents);
	}

	async onload() {
		await this.loadSettings();

		const debounceFunction = debounce(
			// Debounce to avoid multiple eventhandles being added
			() => {
				let allTasks = document.getElementsByClassName(
					"task-list-item-checkbox"
				);
				for (let i = 0; i < allTasks.length; i++) {
					allTasks[i].addEventListener(
						"click",
						this.eventFunction(this)
					);
				}
			},
			300,
			true
		);

		this.app.workspace.onLayoutReady(() => {
			// Needed to work with Obsidian-tasks since it stops propagation
			this.observer = new MutationObserver(() => {
				debounceFunction();
			});
			this.observer.observe(
				document.getElementsByClassName("markdown-reading-view")[0],
				{ childList: true, subtree: true }
			);
		});
		this.addSettingTab(new ObsidianRewarderSettings(this.app, this));
	}

	async onunload(): void {
		// Remove event listeners
		let allTasks = document.getElementsByClassName(
			"task-list-item-checkbox"
		);
		this.observer.disconnect();
		for (let i = 0; i < allTasks.length; i++) {
			allTasks[i].removeEventListener("click", this.eventFunction);
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class CongratulationsModal extends Modal {
	constructor(app: App, public rewardObject: any) {
		super(app);
	}

	onOpen() {
		const { contentEl, containerEl } = this;
		const modal = contentEl.createEl("div", { cls: "rewarderModal" });
		modal.createEl("h1", {
			text: "🎈 🎉 🎈",
		});
		modal.createEl("h1", {
			text: "Congratulations!",
		});
		modal.createEl("p", {
			text: "By completing this task you won this reward:",
		});
		modal.createEl("h1", {
			text: "⭐ " + this.rewardObject.rewardName + " ⭐",
			cls: "rewardName",
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
