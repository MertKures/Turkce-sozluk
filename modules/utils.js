export const defaultSettings = {
    modifiers: ["none"],
    default: "tdk",
    searchSelectedTextOnPopupShow: false,
    storedWords: [] // {word: "word", tdk: {...}, google: {...}}
};

export const searchEngineList = { tdk: "tdk", google: "google" };

export async function getSettings() {
    return fixSettings(await browser.storage.local.get());
}

export function getDefaultSettings() {
    //return { ...defaultSettings, modifiers: [ ...defaultSettings.modifiers ]}
    const settings = {};

    for (const key in defaultSettings) {
        const obj = defaultSettings[key];

        if (obj instanceof Array) settings[key] = [].concat(obj);
        else settings[key] = obj;
    }

    return settings;
}

export async function initializeSettings() {
    const settings = await getSettings();

    await browser.storage.local.set(settings);

    return settings;
}

function fixSettings(_settings) {
    const _defaultSettings = getDefaultSettings();
    try {
        const settings = _defaultSettings;

        for (const key in _defaultSettings) {
            if (!_settings.hasOwnProperty(key))
                continue;

            let defaultValue = _defaultSettings[key];
            let currentVal = _settings[key];

            if (currentVal == null)
                continue;
            else if (typeof defaultValue !== typeof currentVal)
                continue;

            settings[key] = currentVal;
        }

        return settings;
    } catch (error) {
        console.error(error);
        return _defaultSettings;
    }
}

export function sendMessageToTab(message, sender) {
    browser.tabs.sendMessage(sender.tab.id, message);
}

export function createElement(tag, _count, properties) {
    if (!tag) {
        console.error("\"tag\" parameter was empty.")
        return null;
    } else if (!_count || isNaN(parseInt(_count))) {
        if (properties) {
            console.error("Parameter '_count' was either empty or invalid.");
            return null;
        }
    }

    const count = (_count && (_count <= 0) ? false : _count) || 1;

    if (!count) {
        console.error("Parameter \"_count\" was smaller than or equal to zero.", tag, _count, properties);
        return null;
    }

    if (!properties) {
        try {
            if (count == 1)
                return document.createElement(tag);
            else {
                const elementsWithoutProperties = [];
                for (let i = 0; i < count; i++)
                    elementsWithoutProperties.push(document.createElement(tag));
                return elementsWithoutProperties;
            }
        } catch (error) {
            console.error(`There was an error while trying to add an element with a tag named '${tag}' without properties.Error message: ${error}`);
            return null;
        }
    }

    const elementsWithProperties = [];

    for (let i = 0; i < count; i++) {
        const el = document.createElement(tag);

        if (!el) {
            console.warn("The list of elements had an empty item at " + i);
            continue;
        }

        for (let key in properties) {
            if (key != "attributes") {
                //Catching errors because there may be invalid values.
                try {
                    el[key] = properties[key];
                } catch (error) {
                    console.error("The value of property \"" + key + "\" was " + ((!properties[key]) ? "empty" : properties[key]) + ".Error message : " + error);
                }
            } else {
                try {
                    for (let keyAttr in properties[key]) {
                        el.setAttribute(keyAttr, properties[key][keyAttr]);
                    }
                } catch (error) {
                    console.error("The value of attribute \"" + keyAttr + "\" was " + ((!properties[key][keyAttr]) ? "empty" : properties[key][keyAttr]) + ".Error message : " + error);
                }
            }
        }

        elementsWithProperties.push(el);
    }

    if (elementsWithProperties.length == 1)
        return elementsWithProperties[0];
    else
        return elementsWithProperties;
}

export function addElements(parent, ...childs) {
    if (!parent || !childs) {
        console.error("\"parent\" veya \"childs\" parametresi nulldu.Parametreler ...", parent, childs);
        return false;
    }

    for (let i = 0; i < childs.length; i++) {
        if (childs[i] == null) continue;

        let arr = false;

        //Uzunluğu yoksa parametre bir dizi değil.
        if (!childs[i].length) {
            arr = false;
        }
        //Uzunluk 0'dan büyük ise parametre bir dizidir ve işlenecek elemanları vardır.
        else if (childs[i].length > 0) {
            arr = true;
        }
        //Uzunluk 0 olduğundan atla.
        else if (childs[i].length == 0) {
            continue;
        }

        for (let a = 0; a < ((arr) ? childs[i].length : 1); a++) {
            let el = arr === true ? childs[i][a] : childs[i];

            //Elementi ekle.
            try {
                parent.appendChild(el);
            } catch (error) {
                console.error("addElements() -> Error: " + error);
            }
        }
    }

    return true;
}

export async function getSelectedTextOnActiveTab() {
    const tab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];
    let text;

    if (!tab) {
        console.error("Couldn't find active tab.");
        return "";
    }

    try {
        text = await browser.tabs.sendMessage(tab.id, { type: "getSelectedText" });
    } catch (error) {
        console.error(error);
        return "";
    }

    console.debug("Selected text on tab.id: '" + tab.id + "' is: " + text);

    return text ?? "";
}