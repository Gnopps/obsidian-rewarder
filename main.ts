import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	ToggleComponent,
} from "obsidian";

// Remember to rename these classes and interfaces!

export default class ObsidianRewarder extends Plugin {
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

			let rewardsLeft = 0;
			let occurence = "";
			let rewardName = "";
			let firstMetadataValue;
			let secondMetadataValue;
			let dirtyRewardWithoutFirstMetadata = "";

			let firstMetadataStart = dirtyReward.indexOf("{");
			let firstMetadataEnd = dirtyReward.indexOf("}", firstMetadataStart);

			if (firstMetadataEnd < 0) {
				occurence = "default"; // If first metadata not found then put default values
				rewardsLeft = false;
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
						rewardsLeft = false;
					}
					rewardName = dirtyRewardWithoutFirstMetadata;
				} else {
					const secondMetadataValue =
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
			arrayOfCleanedRewards.push(rewardObject);
		}

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

		console.log(arrayOfCleanedRewards);

		// Substract reward quantity
		let indexOfReward = contents.indexOf(
			arrayOfCleanedRewards[chosenReward]
		);
		let newContents = "";
		// vault.modify(rewardsFile, "hej");
	}
	async onload() {
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			if (evt.target.className === "task-list-item-checkbox") {
				if (evt.target.checked) {
					this.handleReward();
				}
				return;
			}
		});
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
