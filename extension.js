/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import IBus from 'gi://IBus';

import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {InputMethod} from 'resource:///org/gnome/shell/misc/inputMethod.js';

export default class ExampleExtension extends Extension {
    enable() {
        this._encoder = new TextEncoder();
        this._injectionManager = new InjectionManager();
        this._inputContext = null;
        this._preeditVisible = false;
        this._anchor = 0;

        this._originalSetPreeditText = InputMethod.prototype['set_preedit_text'].bind(Main.inputMethod);

        this._injectionManager.overrideMethod(
            InputMethod.prototype,
            'set_preedit_text',
            originalMethod => {
                return function (preedit, cursor, anchor, mode) {
                    if (preedit === null && cursor === 0 && anchor === 0)  // on focus out
                        originalMethod.call(this, null, 0, 0, mode);
                };
            }
        );

        this._onFocusWindow();
        this._onFocusWindowID = global.display.connect(
            'notify::focus-window',
            this._onFocusWindow.bind(this)
        );
    }

    disable() {
        this._encoder = null;
        this._injectionManager.clear();
        this._injectionManager = null;
        global.display.disconnect(this._onFocusWindowID);
        this._inputContext?.disconnect(this._updatePreeditTextWithModeID);
    }

    _onFocusWindow() {
        if (this._inputContext === Main.inputMethod._context)
            return;
        this._inputContext = Main.inputMethod._context;
        const im = Main.inputMethod;

        this._updatePreeditTextWithModeID = this._inputContext.connect(
            'update-preedit-text-with-mode',
            (_con, text, pos, visible, mode) => {
                let s = text.get_text();
                let attrs = text.get_attributes();
                let attr;
                let end = pos;

                for (let i = 0; (attr = attrs.get(i)); ++i) {
                    if (attr.get_attr_type() === IBus.AttrType.BACKGROUND &&
                        attr.get_start_index() === pos) {
                        end = attr.get_end_index();
                        break;
                    }
                }

                // mutter bug https://gitlab.gnome.org/GNOME/mutter/-/issues/3547
                this._anchor = this._encoder.encode(s.slice(0, end)).length;

                if (visible)
                    this._originalSetPreeditText(s, pos, this._anchor, mode);
                else if (this._preeditVisible)
                    this._originalSetPreeditText(null, pos, this._anchor, mode);

                this._preeditVisible = visible;
            }
        );

        this._inputContext.connect('show-preedit-text', () => {
            this._originalSetPreeditText(
                im._preeditStr, im._preeditPos, this._anchor, im._preeditCommitMode);
        });

        this._inputContext.connect('hide-preedit-text', () => {
            this._originalSetPreeditText(
                null, im._preeditPos, this._anchor, im._preeditCommitMode);
        });
    }
}
