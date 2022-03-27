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

interface ObsidianRewarderSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: ObsidianRewarderSettings = {
	mySetting: "default",
};

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
			let occurence = "";
			let rewardName = "";
			let firstMetadataValue;
			let secondMetadataValue;
			let dirtyRewardWithoutFirstMetadata = "";

			let firstMetadataStart = dirtyReward.indexOf("{");
			let firstMetadataEnd = dirtyReward.indexOf("}", firstMetadataStart);

			if (firstMetadataEnd < 0) {
				occurence = "default"; // If first metadata not found then put default values
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
					occurence = firstMetadataValue;
				}

				dirtyRewardWithoutFirstMetadata = dirtyReward.replace(
					"{" + firstMetadataValue + "}",
					""
				);

				let secondMetadataStart =
					dirtyRewardWithoutFirstMetadata.indexOf("{");
				let secondMetadataEnd = dirtyRewardWithoutFirstMetadata.indexOf(
					"}",
					secondMetadataStart
				);

				if (secondMetadataEnd < 0) {
					if (rewardsLeft) {
						// If second metadata not found then put default value in the one that is left
						occurence = "default";
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
						occurence = secondMetadataValue;
					}

					rewardName = dirtyRewardWithoutFirstMetadata.replace(
						"{" + secondMetadataValue + "}",
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
				occurence: occurence,
			};
			if (rewardObject.rewardsLeft > 0) {
				// Only add reward if there is inventory
				arrayOfCleanedRewards.push(rewardObject);
			}
		}
		console.log(arrayOfCleanedRewards);
		// Get random reward
		const divideByToGetCorrectMaxRandom = 10 / arrayOfCleanedRewards.length;
		chosenReward = Math.floor(
			(Math.random() * 10) / divideByToGetCorrectMaxRandom
		);
		if (chosenReward === 99) {
			new Notice("This is a notice!");
		} else {
			new CongratulationsModal(
				this.app,
				arrayOfCleanedRewards[chosenReward]
			).open();
		}

		// Substract reward quantity
		let adjustedReward;
		if (arrayOfCleanedRewards[chosenReward].rewardsLeft) {
			let newRewardsLeft =
				arrayOfCleanedRewards[chosenReward].rewardsLeft - 1;
			adjustedReward = arrayOfCleanedRewards[
				chosenReward
			].dirtyReward.replace(
				"{" + arrayOfCleanedRewards[chosenReward].rewardsLeft + "}",
				"{" + newRewardsLeft + "}"
			);
		} else {
			adjustedReward = arrayOfCleanedRewards[chosenReward].dirtyReward;
		}

		// Update rewards file
		let newContents = contents.replace(
			arrayOfCleanedRewards[chosenReward].dirtyReward,
			adjustedReward
		);
		vault.modify(rewardsFile, newContents);
	}

	async onload() {
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

		// let allTasks = document.getElementsByClassName(
		// 	"task-list-item-checkbox"
		// );
		// allTasks[0].addEventListener("click", () =>
		// 	console.log("eventlistener")
		// );

		// allTasks[0].onClickEvent(() => {
		// 	console.log("heuj");
		// });

		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// 	if (evt.target.className === "task-list-item-checkbox") {
		// 		if (evt.target.checked) {
		// 			console.log("domesvesnt");
		// 			this.handleReward();
		// 		}
		// 		return;
		// 	}
		// });
	}

	async onunload(): void {
		let allTasks = document.getElementsByClassName(
			"task-list-item-checkbox"
		);
		this.observer.disconnect();
		for (let i = 0; i < allTasks.length; i++) {
			allTasks[i].removeEventListener("click", this.eventFunction);
		}
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

class ObsidianRewarderSettings extends PluginSettingTab {
	plugin: ObsidianRewarder;

	constructor(app: App, plugin: ObsidianRewarder) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
