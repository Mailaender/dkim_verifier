/**
 * Copyright (c) 2020 Philippe Lieser
 *
 * This software is licensed under the terms of the MIT License.
 *
 * The above copyright and license notice shall be
 * included in all copies or substantial portions of the Software.
 */

// @ts-check
/* eslint-env webextensions */
/* eslint-disable no-magic-numbers */

import DataTable from "./table.mjs.js";
import ExtensionUtils from "../modules/extensionUtils.mjs.js";
import SignRulesProxy from "../modules/dkim/signRulesProxy.mjs.js";
import { getElementById, uploadJsonData } from "./domUtils.mjs.js";

document.addEventListener("DOMContentLoaded", async () => {
	const tableElement = getElementById("rulesTable");
	if (!(tableElement instanceof HTMLTableElement)) {
		throw new Error("element rulesTable is not a HTMLTableElement");
	}

	const userRules = await SignRulesProxy.getUserRules();
	const table = new DataTable(tableElement, true,
		(rowId, columnName, value) => SignRulesProxy.updateRule(rowId, columnName, value),
		(rowId) => SignRulesProxy.deleteRule(rowId),
	);
	table.showData(userRules, ["domain"]);

	browser.runtime.onMessage.addListener((request, sender, /*sendResponse*/) => {
		if (sender.id !== "dkim_verifier@pl") {
			return;
		}
		if (typeof request !== 'object' || request === null) {
			return;
		}
		if (request.event === "ruleAdded") {
			(async () => {
				const rules = await SignRulesProxy.getUserRules();
				table.showData(rules, ["domain"]);
			})();
		}
	});

	const addSignersRule = getElementById("addSignersRule");
	addSignersRule.addEventListener("click", () => {
		ExtensionUtils.createOrRaisePopup(
			"./signRulesUserAdd.html",
			browser.i18n.getMessage("addSignersRule.title"),
			425,
			375,
		);
	});

	const deleteSelectedRows = getElementById("deleteSelectedRows");
	deleteSelectedRows.addEventListener("click", () => {
		table.deleteSelectedRows();
	});

	const buttonHelp = getElementById("buttonHelp");
	buttonHelp.addEventListener("click", () => {
		ExtensionUtils.createOrRaisePopup(
			"./signRulesHelp.html",
			browser.i18n.getMessage("signersRuleHelp.title"),
		);
	});

	const exportRules = getElementById("exportRules");
	exportRules.addEventListener("click", async () => {
		const exportedUserRules = await SignRulesProxy.exportUserRules();
		ExtensionUtils.downloadDataAsJSON(exportedUserRules, "dkim_sign_rules");
	});

	const importRulesDialog = getElementById("importRulesDialog");
	const importRules = getElementById("importRules");
	importRules.addEventListener("click", () => {
		importRulesDialog.style.display = "flex";
	});

	const importRulesDialogAdd = getElementById("importRulesDialogAdd");
	importRulesDialogAdd.addEventListener("click", async () => {
		try {
			importRulesDialog.style.display = "none";
			const data = await uploadJsonData();
			await SignRulesProxy.importUserRules(data, false);
		} catch (error) {
			// TODO: show visible error message to user
			console.error("Error importing sing rules.", error);
		}
	});

	const importRulesDialogReplace = getElementById("importRulesDialogReplace");
	importRulesDialogReplace.addEventListener("click", async () => {
		try {
			importRulesDialog.style.display = "none";
			const data = await uploadJsonData();
			await SignRulesProxy.importUserRules(data, true);
		} catch (error) {
			// TODO: show visible error message to user
			console.error("Error importing sing rules.", error);
		}
	});

	const importRulesDialogCancel = getElementById("importRulesDialogCancel");
	importRulesDialogCancel.addEventListener("click", () => {
		importRulesDialog.style.display = "none";
	});
}, { once: true });
