/**
 * 简单的 JS 版输入法
 * simple-input-method.js
 */
var SimpleInputMethod = {
    hanzi: '', // 已选择的候选汉字
    pinyin: '', // 当前拼音
    result: [], // 当前匹配到的汉字集合
    pageCurrent: 1, // 当前页
    pageSize: 5, // 每页大小
    pageCount: 0, // 总页数
    _input: null,
    _target: null,
    _pinyinTarget: null,
    _resultTarget: null,

    /**
     * 初始化字典配置
     */
    initDict: function () {
        var dict = pinyinUtil.dict;
        if (!dict.py2hz) {
            throw new Error('未找到合适的字典文件！');
        }

        // 给 a-z 扩充候选。例如 b 找不到结果时，取 bi / ba 等首个匹配项。
        dict.py2hz2 = {};
        dict.py2hz2.i = 'i';

        for (var i = 97; i <= 122; i++) {
            var ch = String.fromCharCode(i);
            if (dict.py2hz[ch]) {
                continue;
            }

            for (var key in dict.py2hz) {
                if (Object.prototype.hasOwnProperty.call(dict.py2hz, key) && key.indexOf(ch) === 0) {
                    dict.py2hz2[ch] = dict.py2hz[key];
                    break;
                }
            }
        }
    },

    /**
     * 初始化 DOM 结构
     */
    initDom: function () {
        var oldDom = document.getElementById('simle_input_method');
        if (oldDom) {
            oldDom.parentNode.removeChild(oldDom);
        }

        var temp = '<div class="pinyin"></div><div class="result"><ol></ol><div class="page-up-down"><span class="page-up">▲</span><span class="page-down">▼</span></div></div>';
        var dom = document.createElement('div');
        dom.id = 'simle_input_method';
        dom.className = 'simple-input-method';
        dom.innerHTML = temp;

        var that = this;
        dom.addEventListener('click', function (e) {
            var target = e.target;
            var li = target.closest ? target.closest('li[data-idx]') : null;
            if (li && dom.contains(li)) {
                that.selectHanzi(parseInt(li.dataset.idx, 10));
                return;
            }

            if (target.classList && target.classList.contains('page-up') && that.pageCurrent > 1) {
                that.pageCurrent--;
                that.refreshPage();
            } else if (target.classList && target.classList.contains('page-down') && that.pageCurrent < that.pageCount) {
                that.pageCurrent++;
                that.refreshPage();
            }
        });

        document.body.appendChild(dom);
    },

    /**
     * 初始化输入法
     */
    init: function (selector) {
        this.initDict();
        this.initDom();

        var inputs = document.querySelectorAll(selector);
        this._target = document.querySelector('#simle_input_method');
        this._pinyinTarget = document.querySelector('#simle_input_method .pinyin');
        this._resultTarget = document.querySelector('#simle_input_method .result ol');

        var that = this;
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].addEventListener('keydown', function (e) {
                that.handleKeyDown(e, this);
            });

            inputs[i].addEventListener('focus', function () {
                if (that._input !== this) {
                    that.hide();
                }
            });
        }
    },

    /**
     * 处理按键
     */
    handleKeyDown: function (e, input) {
        // 不拦截复制、粘贴、撤销、全选、浏览器快捷键等组合键。
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        var key = e.key;
        var preventDefault = false;

        if (/^[a-zA-Z]$/.test(key)) {
            this.addChar(key.toLowerCase(), input);
            preventDefault = true;
        } else if (key === 'Backspace' && this.pinyin) {
            this.delChar();
            preventDefault = true;
        } else if (/^[1-9]$/.test(key) && this.pinyin) {
            this.selectHanzi(parseInt(key, 10));
            preventDefault = true;
        } else if (key === ' ' && this.pinyin) {
            this.selectHanzi(1);
            preventDefault = true;
        } else if (key === 'Escape') {
            if (this.pinyin) {
                this.hide();
                preventDefault = true;
            }
        } else if (key === 'Enter' && this.pinyin) {
            this.selectHanzi(0);
            preventDefault = true;
        } else if ((key === 'PageUp' || key === 'ArrowUp' || key === ',') && this.canPageUp()) {
            this.pageCurrent--;
            this.refreshPage();
            preventDefault = true;
        } else if ((key === 'PageDown' || key === 'ArrowDown' || key === '.') && this.canPageDown()) {
            this.pageCurrent++;
            this.refreshPage();
            preventDefault = true;
        }

        if (preventDefault) {
            e.preventDefault();
        }
    },

    canPageUp: function () {
        return this.pinyin && this.pageCount > 0 && this.pageCurrent > 1;
    },

    canPageDown: function () {
        return this.pinyin && this.pageCount > 0 && this.pageCurrent < this.pageCount;
    },

    /**
     * 单个拼音转单个汉字，例如输入 "a" 返回 "阿啊呵腌嗄吖锕"
     */
    getSingleHanzi: function (pinyin) {
        return pinyinUtil.dict.py2hz2[pinyin] || pinyinUtil.dict.py2hz[pinyin] || '';
    },

    /**
     * 拼音转汉字
     * @param {string} pinyin 需要转换的拼音，如 zhongguo
     * @return {Array} 返回格式类似：[["中", "重", "种"], "zhong'guo"]
     */
    getHanzi: function (pinyin) {
        var result = this.getSingleHanzi(pinyin);
        if (result) {
            return [result.split(''), pinyin];
        }

        var temp = '';
        for (var i = 0, len = pinyin.length; i < len; i++) {
            temp += pinyin[i];
            result = this.getSingleHanzi(temp);
            if (!result) {
                continue;
            }

            // flag 表示当前能匹配到结果，并且后续还能组成更长拼音。
            var flag = false;
            if (i + 1 < pinyin.length) {
                for (var j = 1; j <= 5 && i + j < len; j++) {
                    if (this.getSingleHanzi(pinyin.substr(0, i + j + 1))) {
                        flag = true;
                        break;
                    }
                }
            }

            if (!flag) {
                return [result.split(''), pinyin.substr(0, i + 1) + "'" + pinyin.substr(i + 1)];
            }
        }

        return [[], pinyin];
    },

    /**
     * 选择某个汉字。i 为 1-5；i 为 0 时提交原始拼音。
     */
    selectHanzi: function (i) {
        if (!this._input) {
            this._input = document.activeElement;
        }

        if (i === 0) {
            this.insertAtCursor(this._input, this.pinyin.replace(/'/g, ''));
            this.hide();
            return;
        }

        var hz = this.result[(this.pageCurrent - 1) * this.pageSize + i - 1];
        if (!hz) {
            return;
        }

        this.hanzi += hz;
        var idx = this.pinyin.indexOf("'");
        if (idx > 0) {
            this.pinyin = this.pinyin.substr(idx + 1);
            this.refresh();
        } else {
            this.insertAtCursor(this._input, this.hanzi);
            this.hide();
        }
    },

    /**
     * 将拼音转换成汉字候选词，并显示在界面上
     */
    refresh: function () {
        var temp = this.getHanzi(this.pinyin.replace(/'/g, ''));
        this.result = temp[0];
        this.pinyin = temp[1];
        this.pageCurrent = 1;
        this.pageCount = Math.ceil(this.result.length / this.pageSize);
        this._pinyinTarget.textContent = this.hanzi + this.pinyin;
        this.refreshPage();
    },

    refreshPage: function () {
        var temp = this.result.slice((this.pageCurrent - 1) * this.pageSize, this.pageCurrent * this.pageSize);
        var html = '';
        var i = 0;

        temp.forEach(function (val) {
            i++;
            html += '<li data-idx="' + i + '"><span class="idx">' + i + '.</span>' + this.escapeHtml(val) + '</li>';
        }, this);

        this._target.querySelector('.page-up').style.opacity = this.pageCurrent > 1 ? '1' : '.3';
        this._target.querySelector('.page-down').style.opacity = this.pageCurrent < this.pageCount ? '1' : '.3';
        this._resultTarget.innerHTML = html;
    },

    addChar: function (ch, input) {
        if (this.pinyin.length === 0) {
            this.show(input);
        }

        this.pinyin += ch;
        this.refresh();
    },

    delChar: function () {
        if (this.pinyin.length <= 1) {
            this.hide();
            return;
        }

        this.pinyin = this.pinyin.substr(0, this.pinyin.length - 1);
        this.refresh();
    },

    show: function (input) {
        var pos = input.getBoundingClientRect();
        this._target.style.left = pos.left + window.scrollX + 'px';
        this._target.style.top = pos.top + pos.height + window.scrollY + 6 + 'px';
        this._input = input;
        this._target.style.display = 'block';
    },

    hide: function () {
        this.reset();
        if (this._target) {
            this._target.style.display = 'none';
        }
    },

    reset: function () {
        this.hanzi = '';
        this.pinyin = '';
        this.result = [];
        this.pageCurrent = 1;
        this.pageCount = 0;

        if (this._pinyinTarget) {
            this._pinyinTarget.textContent = '';
        }
        if (this._resultTarget) {
            this._resultTarget.innerHTML = '';
        }
    },

    insertAtCursor: function (input, value) {
        if (!input) {
            return;
        }

        input.focus();

        if (typeof input.selectionStart === 'number') {
            var startPos = input.selectionStart;
            var endPos = input.selectionEnd;
            var restoreTop = input.scrollTop;
            input.value = input.value.substring(0, startPos) + value + input.value.substring(endPos);
            input.selectionStart = startPos + value.length;
            input.selectionEnd = startPos + value.length;
            input.scrollTop = restoreTop;
        } else {
            input.value += value;
        }
    },

    escapeHtml: function (text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};
