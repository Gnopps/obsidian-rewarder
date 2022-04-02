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

export interface ObsidianRewarderSettings {
	escapeCharacterBegin: string;
	escapeCharacterEnd: string;
	occurrenceTypes: Array<object>;
	showModal: boolean;
}

export const DEFAULT_SETTINGS: ObsidianRewarderSettings = {
	escapeCharacterBegin: "{",
	escapeCharacterEnd: "}",
	occurrenceTypes: [
		{ label: "common", value: 20 },
		{ label: "rare", value: 5 },
		{ label: "legendary", value: 0.5 },
	],
	showModal: true,
};

export class ObsidianRewarderSettings extends PluginSettingTab {
	plugin: ObsidianRewarder;

	constructor(app: App, plugin: ObsidianRewarder) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h1", { text: "Functionality settings" });

		new Setting(this.containerEl)
			.setName("Show popup when reward is awarded")
			.setDesc(
				"If disabled a less prominent notice will be shown instead"
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.showModal);
				toggle.onChange(async (value) => {
					this.plugin.settings.showModal = value;
					await this.plugin.saveSettings();
				});
			});

		containerEl.createEl("h1", { text: "Rewards settings" });

		// Settings for occurence

		containerEl.createEl("h3", {
			text: "Occurrence values",
		});

		for (
			let i = 0;
			i < Object.keys(this.plugin.settings.occurrenceTypes).length;
			i++
		) {
			new Setting(containerEl)
				.setName(
					"How often should " +
						this.plugin.settings.occurrenceTypes[i].label +
						" rewards occur?"
				)
				.setDesc(
					"Between 0.1% to 100% for every finished task" +
						(i === 0
							? ". This is the default value for rewards"
							: "")
				)
				.addText((text) => {
					text.inputEl.type = "number";
					text.setPlaceholder(
						this.plugin.settings.occurrenceTypes[i].value
					)
						.setValue(this.plugin.settings.occurrenceTypes[i].value)
						.onChange(async (value) => {
							let refreshDisplay = false;
							if (value > 100) {
								value = 100;
								refreshDisplay = true;
							} else if (value < 0.1) {
								value = 0.1;
								refreshDisplay = true;
							}
							this.plugin.settings.occurrenceTypes[i].value =
								Number(value);
							await this.plugin.saveSettings();
							if (refreshDisplay) {
								this.display();
							}
						});
				})
				.addExtraButton((button) =>
					button
						.setIcon("reset")
						.setTooltip("Restore default")
						.onClick(async () => {
							this.plugin.settings.occurrenceTypes[i].value =
								DEFAULT_SETTINGS.occurrenceTypes[i].value;
							await this.plugin.saveSettings();
							this.display();
						})
				);
		}

		// Settings for occurence labels

		containerEl.createEl("h3", {
			text: "Occurence labels",
		});

		for (
			let i = 0;
			i < Object.keys(this.plugin.settings.occurrenceTypes).length;
			i++
		) {
			new Setting(containerEl)
				.setName(
					'Would you like to rename "' +
						this.plugin.settings.occurrenceTypes[i].label +
						'"?'
				)
				.addText((text) => {
					text.inputEl.type = "text";
					text.setPlaceholder(
						this.plugin.settings.occurrenceTypes[i].label
					)
						.setValue(this.plugin.settings.occurrenceTypes[i].label)
						.onChange(async (value) => {
							this.plugin.settings.occurrenceTypes[i].label =
								value;
							await this.plugin.saveSettings();
						});
				})
				.addExtraButton((button) =>
					button
						.setIcon("reset")
						.setTooltip("Restore default")
						.onClick(async () => {
							this.plugin.settings.occurrenceTypes[i].label =
								DEFAULT_SETTINGS.occurrenceTypes[i].label;
							await this.plugin.saveSettings();
							this.display();
						})
				);
		}

		// Settings for escape characters
		containerEl.createEl("h3", {
			text: "Special characters",
		});

		new Setting(containerEl)
			.setName("Start of metadata")
			.setDesc("This character shows the start of the reward's data")
			.addText((text) =>
				text
					.setPlaceholder("{")
					.setValue(this.plugin.settings.escapeCharacterBegin)
					.onChange(async (value) => {
						this.plugin.settings.escapeCharacterBegin = value;
						await this.plugin.saveSettings();
					})
			)
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.escapeCharacterBegin =
							DEFAULT_SETTINGS.escapeCharacterBegin;
						await this.plugin.saveSettings();
						this.display();
					})
			);
		new Setting(containerEl)
			.setName("End of metadata")
			.setDesc("This character shows the end of the reward's data")
			.addText((text) => {
				text.setPlaceholder("}")
					.setValue(this.plugin.settings.escapeCharacterEnd)
					.onChange(async (value) => {
						this.plugin.settings.escapeCharacterEnd = value;
						await this.plugin.saveSettings();
					});
			})
			.addExtraButton((button) =>
				button
					.setIcon("reset")
					.setTooltip("Restore default")
					.onClick(async () => {
						this.plugin.settings.escapeCharacterEnd =
							DEFAULT_SETTINGS.escapeCharacterEnd;
						await this.plugin.saveSettings();
						this.display();
					})
			);
	}
}
