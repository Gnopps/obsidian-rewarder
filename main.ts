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
		// Read contents of rewards file
		const { vault } = this.app;
		let rewardsFile = vault.getAbstractFileByPath("Rewards.md");
		const contents = await this.app.vault.read(rewardsFile);
		var char = "\n";
		let x = 0;
		let y = 0;
		let listOfRewards = [];
		while ((y = contents.indexOf(char, x)) !== -1) {
			listOfRewards.push(contents.substring(x, y));
			x = y + 1;
		}
		listOfRewards.push(contents.substring(x));

		// Clean rewards from special characters
		for (let i = 0; i < listOfRewards.length; i++) {
			listOfRewards[i] = listOfRewards[i].replace(
				/\n|\t|\r|- |\* |\+ /g,
				""
			);
		}
		const divideByToGetCorrectMaxRandom = 10 / listOfRewards.length;
		const chosenReward = Math.floor(
			(Math.random() * 10) / divideByToGetCorrectMaxRandom
		);
		console.log(chosenReward);
		console.log(listOfRewards[chosenReward] - 9);
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
