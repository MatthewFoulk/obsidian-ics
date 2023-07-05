import {
	MarkdownView
} from 'obsidian';

import {
	Calendar,
	ICSSettings,
	DEFAULT_SETTINGS,
} from "./settings/ICSSettings";

import ICSSettingsTab from "./settings/ICSSettingsTab";

import {
	getDateFromFile
} from "obsidian-daily-notes-interface";

import {
	Plugin,
	request
} from 'obsidian';
import { parseIcs, filterMatchingEvents } from './icalUtils';

const moment = require('moment');

export default class ICSPlugin extends Plugin {
	data: ICSSettings;

	async addCalendar(calendar: Calendar): Promise<void> {
        this.data.calendars = {
            ...this.data.calendars,
			[calendar.icsName]: calendar 
        };
        await this.saveSettings();
    }

	async removeCalendar(calendar: Calendar) {
        if (this.data.calendars[calendar.icsName]) {
            delete this.data.calendars[calendar.icsName];
        }
        await this.saveSettings();
    }

  async getEvents(date: string) {
    var events: any[] = [];

    for (const calendar in this.data.calendars) {
      const calendarSetting = this.data.calendars[calendar];
      console.log(calendarSetting);
      var icsArray: any[] = [];
      var icsArray = parseIcs(await request({
        url: calendarSetting.icsUrl
      }));
      const todayEvents = filterMatchingEvents(icsArray, date);
      console.log(todayEvents);

      todayEvents.forEach((e) => {
        events.push(
          { 'time': moment(e.start).format("HH:mm"),
            'icsName': calendarSetting.icsName,
            'summary': e.summary,
            'description': e.description,
            'location': e.location
      });});
    }
    return events;
  }

	async onload() {
		console.log('loading ics plugin');
		await this.loadSettings();
		this.addSettingTab(new ICSSettingsTab(this.app, this));
		this.addCommand({
			id: "import_events",
			name: "import events",
			hotkeys: [{
				modifiers: ["Alt", "Shift"],
				key: 'T',
			}, ],
			callback: async () => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				const fileDate = getDateFromFile(activeView.file, "day").format("YYYY-MM-DD");
        var events: any[] = await this.getEvents(fileDate);
        var mdArray: string [] = [];

        events.forEach((e) => {
          	let formattedString = `- [ ]  ${e.time} ${e.icsName} ${e.summary}`;
			if (e.location !== 'undefined') {
				formattedString += ` ${e.location}`;
			}
			mdArray.push(formattedString.trim());
        });
				activeView.editor.replaceRange(mdArray.sort().join("\n"), activeView.editor.getCursor());
			}
		});
	}

	onunload() {
		console.log('unloading ics plugin');
	}

	async loadSettings() {
		this.data = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.data);
	}
}


