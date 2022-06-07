/**
 * Synth patch editor for Highcharts Sonification Instruments
 * */

/* eslint-disable jsdoc/require-param-type */
/* eslint-disable jsdoc/require-param-description */
/* eslint-disable no-use-before-define */
/* eslint-disable require-unicode-regexp */

////////////////////////////////////////////////////////////////////////////////
// General tweaks

const defTracks = 4;    // How many tracks should we support?

////////////////////////////////////////////////////////////////////////////////

let audioContext;
let uidCounter = 0; // For control IDs
let synthEditor;
const el = document.getElementById.bind(document),
    childValue = (parent, childSelector) =>
        parent.querySelector(childSelector).value,
    SynthPatch = Highcharts.sonification.SynthPatch,
    synths = [],
    presets = {
        basic: el('preset-basic').textContent,
        saxophone: el('preset-saxophone').textContent,
        piano: el('preset-piano').textContent,
        vibraphone: el('preset-vibraphone').textContent,
        synth: el('preset-synth').textContent,
        rock: el('preset-rock').textContent,
        whirlwind: el('preset-whirlwind').textContent
    };


function newSynth(audioContext, options) {
    const s = new SynthPatch(audioContext, options);
    s.connect(audioContext.destination);
    s.startSilently();
    return s;
}


function playSequence(synth, notes, durationMultiplier) {
    if (audioContext && synth) {
        const t = audioContext.currentTime;
        notes.forEach(
            (freq, i) => synth.playFreqAtTime(
                t + i * 0.1 * durationMultiplier, freq, 150 * durationMultiplier
            )
        );
    }
}
const playJingle = synth => playSequence(synth,
    [261.63, 329.63, 392, 523.25], 1);
const playWideRange = synth => playSequence(synth, [
    49.00, 65.41, 82.41, 87.31, 130.81, 174.61, 220.00, 261.63, 329.63,
    392.00, 493.88, 523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98,
    1975.53, 2093.00
], 1.5);


// Create a chart for defining a volume envelope (attack or release)
function createEnvelopeChart(type, containerEl, onEdit) {
    function cleanSeriesData(series) {
        const newData = series.points.map(o => [o.x, o.y])
            .sort((a, b) => a[0] - b[0]);
        if (newData[0] && newData[0][0] > 1) {
            newData.unshift([0, type === 'attack' ? 0 : 1]);
        }
        series.setData(newData);
        onEdit();
    }

    return Highcharts.chart(containerEl, {
        title: { text: null },
        credits: { enabled: false },
        accessibility: { enabled: false },
        legend: { enabled: false },
        tooltip: { enabled: false },
        chart: {
            backgroundColor: 'transparent',
            plotBorderWidth: 1,
            spacing: [10, 5, 0, 0],
            events: {
                click: function (e) {
                    this.series[0].addPoint([
                        Math.round(e.xAxis[0].value),
                        Math.round(e.yAxis[0].value * 100) / 100
                    ]);
                    cleanSeriesData(this.series[0]);
                    onEdit();
                },
                load: function () {
                    const btn = document.createElement('button');
                    let hideTimeout;
                    this.container.appendChild(btn);
                    btn.classList.add('chartReset', 'hidden');
                    btn.textContent = 'Reset';
                    btn.onclick = e => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.series[0].setData([]);
                        onEdit();
                    };
                    this.renderTo.addEventListener('mouseenter', () => {
                        clearTimeout(hideTimeout);
                        btn.classList.remove('hidden');
                    });
                    this.renderTo.addEventListener('mouseleave', () => {
                        hideTimeout = setTimeout(() => btn.classList.add('hidden'), 400);
                    });
                }
            }
        },
        yAxis: {
            min: 0,
            max: 1,
            tickAmount: 3,
            minPadding: 0,
            maxPadding: 0,
            minRange: 0,
            startOnTick: false,
            endOnTick: false,
            title: {
                enabled: false
            }
        },
        xAxis: {
            min: 0,
            max: 600,
            minPadding: 0,
            maxPadding: 0,
            tickAmount: 3,
            minRange: 0,
            startOnTick: false,
            endOnTick: false
        },
        series: [{
            cursor: 'pointer',
            pointInterval: 50,
            marker: {
                enabled: true
            },
            dragDrop: {
                draggableY: true,
                draggableX: true,
                dragMaxX: 600,
                dragMinX: 1,
                dragMaxY: 1,
                dragMinY: 0
            },
            point: {
                events: {
                    click: function () {
                        const series = this.series;
                        this.remove(false);
                        cleanSeriesData(series);
                    },
                    drop: function (e) {
                        const point = e.newPoints[e.newPointId].point,
                            { x, y } = e.newPoint;
                        e.preventDefault();
                        point.update({
                            x: Math.round(x),
                            y: Math.round(y * 100) / 100
                        }, false);
                        cleanSeriesData(point.series);
                    }
                }
            },
            data: []
        }]
    });
}


function addOscControls(controlsContainerEl, options) {
    let content = '';
    const opts = options || {},
        typeOptions = ['sine', 'sawtooth', 'triangle', 'square', 'whitenoise', 'pulse']
            .reduce((str, option) => `${str}<option value="${option}">${option}</option>`, ''),
        addChartContainer = (id, label) => {
            const uid = `${id}-${uidCounter++}`;
            content += `<div class="chart span2" id="${uid}"></div>
                <label class="chartlabel">${label}</label>`;
            return uid;
        },
        addControl = (type, className, label, controlContent, step) => {
            const uid = `${className}-${uidCounter++}`,
                shared = `id="${uid}" class="span2 ${className}" name="${uid}"`;
            content += `<label for="${uid}">${label}</label>`;
            if (type === 'select') {
                content += `<select ${shared}>${controlContent}</select>`;
            } else if (type === 'input') {
                // eslint-disable-next-line
                content += `<input type="number" ${shared} value="${controlContent}" step="${step}">`;
            }
            return uid;
        };

    const controlIds = {
        type: addControl('select', 'Type', 'Waveform type', typeOptions),
        freqMultiplier: addControl('input', 'FreqMultiplier', 'Freq multiplier',
            opts.freqMultiplier || '', 1),
        fixedFrequency: addControl('input', 'FixedFreq', 'Fixed frequency',
            opts.fixedFrequency || '', 1),
        volume: addControl('input', 'Vol', 'Volume',
            opts.volume || '0.5', 0.05),
        detune: addControl('input', 'Detune', 'Detune (cents)',
            opts.detune || '', 1),
        pulseWidth: addControl('input', 'PulseWidth', 'Pulse width',
            opts.pulseWidth || '', 0.05),
        volPitchTrackingMult: addControl('input', 'VolPitchTrackingMult', 'Volume tracking multiplier',
            opts.volumePitchTrackingMultiplier || '', 0.05),
        lowpassFreq: addControl('input', 'LowpassFreq', 'Lowpass frequency',
            opts.lowpass && opts.lowpass.frequency || '', 1),
        lowpassPitchTrackingMult: addControl('input', 'LowpassPitchTrackingMult', 'Lowpass tracking multiplier',
            opts.lowpass && opts.lowpass.frequencyPitchTrackingMultiplier || '', 0.1),
        lowpassQ: addControl('input', 'LowpassQ', 'Lowpass resonance',
            opts.lowpass && opts.lowpass.Q || '', 0.1),
        highpassFreq: addControl('input', 'HighpassFreq', 'Highpass frequency',
            opts.highpass && opts.highpass.frequency || '', 1),
        highpassPitchTrackingMult: addControl('input', 'HighpassPitchTrackingMult', 'Highpass tracking multiplier',
            opts.highpass && opts.highpass.frequencyPitchTrackingMultiplier || '', 0.1),
        highpassQ: addControl('input', 'HighpassQ', 'Highpass resonance',
            opts.highpass && opts.highpass.Q || '', 0.1),
        fmOsc: addControl('select', 'FMOsc', 'FM oscillator', ''),
        vmOsc: addControl('select', 'VMOsc', 'VM oscillator', ''),
        attackEnvChart: addChartContainer('AttackEnv', 'Attack envelope'),
        releaseEnvChart: addChartContainer('ReleaseEnv', 'Release envelope')
    };

    controlsContainerEl.innerHTML = content;
    return controlIds;
}


class SynthEditor {

    constructor(htmlContainerEl) {
        const synthEditor = this;
        this.container = htmlContainerEl;
        this.oscIdCounter = 1;
        this.oscillators = [];
        this.activeSynthIx = 0;

        // TODO: HTML should probably be generated.
        this.child('.playWideRange').onclick = playWideRange;
        this.child('.addOsc').onclick = this.addOscillator.bind(this);
        this.child('.resetEQ').onclick = this.resetEQ.bind(this);
        this.child('.masterVolume').onchange = this.child('.glideDuration').onchange =
            this.updateFromUI.bind(this);
        this.child('.preset').innerHTML = Object.keys(presets)
            .reduce((str, p) => `${str}<option value="${p}">${p}</option>`, '');
        this.child('.preset').onchange = function () {
            const options = JSON.parse(presets[this.value]);
            synthEditor.applyOptions(options);
            this.blur();
        };
        this.charts = {
            masterAttackEnvChart: createEnvelopeChart(
                'attack', this.child('.masterAttackEnvChart'), this.updateFromUI.bind(this)
            ),
            masterReleaseEnvChart: createEnvelopeChart(
                'release', this.child('.masterReleaseEnvChart'), this.updateFromUI.bind(this)
            )
        };
        this.populateEQSliders();
        setTimeout(() => this.applyOptions(JSON.parse(presets.basic)), 0);
    }

    addOscillator(options) {
        const synth = this,
            id = this.oscIdCounter++,
            oscContainer = this.child('.oscillators'),
            cardContainer = document.createElement('div'),
            controls = document.createElement('div'),
            oscillator = {
                id,
                controlIds: addOscControls(controls, options),
                remove() {
                    oscContainer.removeChild(cardContainer);
                    synth.oscillators.splice(
                        synth.oscillators.indexOf(oscillator), 1
                    );
                    synth.charts[oscillator.controlIds.attackEnvChart]
                        .destroy();
                    synth.charts[oscillator.controlIds.releaseEnvChart]
                        .destroy();
                    delete synth.charts[oscillator.controlIds.attackEnvChart];
                    delete synth.charts[oscillator.controlIds.releaseEnvChart];
                    synth.updateModulationLists();
                }
            };

        this.oscillators.push(oscillator);
        controls.className = 'controlsContainer';
        cardContainer.className = 'oscillator';
        const heading = document.createElement('h3');
        heading.textContent = '#' + id;
        const remove = document.createElement('button');
        remove.textContent = 'Remove #' + id;
        remove.onclick = oscillator.remove;

        cardContainer.appendChild(heading);
        cardContainer.appendChild(remove);
        cardContainer.appendChild(controls);
        oscContainer.appendChild(cardContainer);

        setTimeout(() => {
            this.charts[
                oscillator.controlIds.attackEnvChart
            ] = createEnvelopeChart(
                'attack', oscillator.controlIds.attackEnvChart, this.updateFromUI.bind(this)
            );
            this.charts[
                oscillator.controlIds.releaseEnvChart
            ] = createEnvelopeChart(
                'release', oscillator.controlIds.releaseEnvChart, this.updateFromUI.bind(this)
            );
            el(oscillator.controlIds.vmOsc).onchange =
            el(oscillator.controlIds.fmOsc).onchange = function () {
                if (this.value === '' + id) {
                    alert("Oscillator can't modulate itself - please assign to a different oscillator.");
                    this.value = '';
                }
            };
            Object.values(oscillator.controlIds).forEach(id => el(id)
                .addEventListener('change', synth.updateModulationLists.bind(synth)));
            synth.updateModulationLists();
        }, 0);
    }


    applyEqToUI(eqDefinitions) {
        const defs = eqDefinitions.slice(0),
            eqContainers = this.container.querySelectorAll('.eqSlider'),
            defaultFrequencies = [200, 400, 800, 1600, 2200, 3600, 6400, 12800];

        let i = 0;
        while (defs.length < eqContainers.length) {
            defs.push({ frequency: defaultFrequencies[i++], gain: 0, Q: 1 });
        }

        defs.sort((a, b) => a.frequency - b.frequency).forEach((def, ix) => {
            const sliderContainer = eqContainers[ix];
            sliderContainer.querySelector('.gain').value = def.gain;
            sliderContainer.querySelector('.freq').value = def.frequency;
            sliderContainer.querySelector('.q').value = def.Q;
        });
    }


    applyOptions(options) {
        const envToChart = (chart, env) => this.charts[chart].series[0].setData(
            (env || []).map(o => [o.t, o.vol])
        );

        // Reset first
        let i = this.oscillators.length;
        while (i--) {
            this.oscillators[i].remove();
        }
        this.oscIdCounter = 1;

        this.child('.masterVolume').value = options.masterVolume || 1;
        this.child('.glideDuration').value = options.noteGlideDuration || '';
        envToChart('masterAttackEnvChart', options.masterAttackEnvelope);
        envToChart('masterReleaseEnvChart', options.masterReleaseEnvelope);
        this.applyEqToUI(options.eq || []);
        options.oscillators.forEach(this.addOscillator.bind(this));

        setTimeout(() => { // Settimeout to allow charts etc to build
            const opts = options.oscillators;
            this.oscillators.forEach((osc, i) => {
                el(osc.controlIds.type).value = opts[i].type;
                el(osc.controlIds.fmOsc).value =
                    opts[i].fmOscillator !== null ? opts[i].fmOscillator + 1 : '';
                el(osc.controlIds.vmOsc).value =
                    opts[i].vmOscillator !== null ? opts[i].vmOscillator + 1 : '';
                envToChart(osc.controlIds.attackEnvChart,
                    opts[i].attackEnvelope);
                envToChart(osc.controlIds.releaseEnvChart,
                    opts[i].releaseEnvelope);
            });
            setTimeout(this.updateFromUI.bind(this), 0);
            setTimeout(() => playJingle(synths[this.activeSynthIx]), 50);
        }, 0);
    }


    child(elSelector) {
        return this.container.querySelector(elSelector);
    }


    getEnvelopeFromChart(chartContainerId) {
        const chart = this.charts[chartContainerId];
        return chart ? chart.series[0].points
            .map(p => ({ t: p.x, vol: p.y })) : [];
    }


    getEqFromUI() {
        return [...this.container.querySelectorAll('.eqSlider')]
            .reduce((definitions, sliderContainer) => {
                const gain = parseFloat(childValue(sliderContainer, '.gain'));
                if (gain < -0.01 || gain > 0.01) {
                    const frequency = parseFloat(childValue(sliderContainer, '.freq')) || 0,
                        Q = parseFloat(childValue(sliderContainer, '.q')) || 1;
                    definitions.push({ frequency, Q, gain });
                }
                return definitions;
            }, []);
    }


    getPatchOptionsFromUI() {
        const val = id => el(id).value,
            getIfNum = (parser, id) => {
                const x = parser(val(id));
                return isNaN(x) ? void 0 : x;
            },
            floatVal = id => getIfNum(parseFloat, id),
            intVal = id => getIfNum(n => parseInt(n, 10), id),
            removeUnusedProps = obj => {
                for (const [key, val] of Object.entries(obj)) {
                    if (
                        typeof val === 'undefined' ||
                        val.length === 0 ||
                        typeof val === 'object' && !Object.values(val)
                            .some(n => typeof n !== 'undefined')
                    ) {
                        delete obj[key];
                    }
                }
                return obj;
            };

        const options = {
            masterVolume: childValue(this.container, '.masterVolume'),
            noteGlideDuration: childValue(this.container, '.glideDuration'),
            masterAttackEnvelope: this.getEnvelopeFromChart('masterAttackEnvChart'),
            masterReleaseEnvelope: this.getEnvelopeFromChart('masterReleaseEnvChart'),
            eq: this.getEqFromUI(),
            oscillators: this.oscillators.map(osc => {
                const i = osc.controlIds,
                    getOscWithId = id => this.oscillators
                        .findIndex(osc => osc.id === id),
                    fmIndex = getOscWithId(intVal(i.fmOsc)),
                    vmIndex = getOscWithId(intVal(i.vmOsc));

                const oscOptions = {
                    type: val(i.type),
                    freqMultiplier: floatVal(i.freqMultiplier),
                    fixedFrequency: floatVal(i.fixedFrequency),
                    volume: floatVal(i.volume),
                    detune: intVal(i.detune),
                    pulseWidth: floatVal(i.pulseWidth),
                    volumePitchTrackingMultiplier:
                        floatVal(i.volPitchTrackingMult),
                    lowpass: {
                        frequency: floatVal(i.lowpassFreq),
                        frequencyPitchTrackingMultiplier:
                            floatVal(i.lowpassPitchTrackingMult),
                        Q: floatVal(i.lowpassQ)
                    },
                    highpass: {
                        frequency: floatVal(i.highpassFreq),
                        frequencyPitchTrackingMultiplier:
                            floatVal(i.highpassPitchTrackingMult),
                        Q: floatVal(i.highpassQ)
                    },
                    fmOscillator: fmIndex > -1 ? fmIndex : void 0,
                    vmOscillator: vmIndex > -1 ? vmIndex : void 0,
                    attackEnvelope: this.getEnvelopeFromChart(i.attackEnvChart),
                    releaseEnvelope:
                        this.getEnvelopeFromChart(i.releaseEnvChart)
                };

                return removeUnusedProps(oscOptions);
            })
        };
        removeUnusedProps(options);
        return options;
    }

    populateEQSliders() {
        const container = this.child('.eqSliders');
        for (let i = 0; i < 8; ++i) {
            const col = document.createElement('div');
            col.className = 'eqSlider';
            // eslint-disable-next-line
            col.innerHTML = `<input class="gain" orient="vertical" type="range" min="-40" max="20" step="2">
            <input class="freq" type="number">
            <input class="q" type="number">
            `;
            container.appendChild(col);
        }
        setTimeout(() => this.container.querySelectorAll('.eqSliders input')
            .forEach(input => (input.onchange = this.updateFromUI.bind(this))),
        0);
    }


    resetEQ() {
        this.container.querySelectorAll('.eqSliders .gain').forEach(input => (input.value = 0));
        this.updateFromUI();
    }


    setActiveSynth(ix) {
        this.activeSynthIx = ix;
        this.applyOptions(synths[ix].options);
    }


    updateFromUI() {
        const options = this.getPatchOptionsFromUI(),
            asix = this.activeSynthIx;
        this.child('.json').textContent = JSON.stringify(options, null, ' ');

        if (synths[asix]) {
            synths[asix].stop();
        }

        if (audioContext) {
            synths[asix] = newSynth(audioContext, options);
        }
    }


    // Update the lists of oscillators we can modulate in the UI
    updateModulationLists() {
        const newList = this.oscillators.reduce(
            (str, osc) => `${str}<option value="${osc.id}">#${osc.id}</option>`,
            '<option value=""></option>'
        );
        this.oscillators.forEach(o => {
            const valInList = val => newList.indexOf(`value="${val}"`) > 0,
                fmSel = el(o.controlIds.fmOsc),
                vmSel = el(o.controlIds.vmOsc),
                oldFMVal = fmSel.value,
                oldVMVal = vmSel.value;
            vmSel.innerHTML = fmSel.innerHTML = newList;
            // Don't remove existing values if we don't have to
            if (valInList(oldFMVal)) {
                fmSel.value = oldFMVal;
            }
            if (valInList(oldVMVal)) {
                vmSel.value = oldVMVal;
            }
        });
        this.updateFromUI();
    }
}


// Use synth --------------------------------------------------------------------------------------------

el('startSynth').onclick = function () {
    audioContext = new AudioContext();

    const basic = JSON.parse(presets.basic);
    for (let i = 0; i < defTracks; ++i) {
        synths.push(newSynth(audioContext, basic));
    }

    synthEditor = new SynthEditor(el('synthContainer'));

    el('controls').classList.remove('hidden');
    this.classList.add('hidden');
    el('keyStatus').textContent = 'No synth key pressed';
    setTimeout(playJingle, 50);
};


document.querySelectorAll('.json').forEach(el => (el.onclick = () => el.select()));
el('showHelp').onclick = () => el('help').classList.toggle('hidden');


////////////////////////////////////////////////////////////////////////////////
// TRACKER FOLLOWS
////////////////////////////////////////////////////////////////////////////////

/**
 * Attach onNoteChange callbacks with options.onNote, and track selection
 * callbacks with options.onTrackSelection.
 *
 * @param id
 * @param options
 */
const Tracker = (id, options) => {
    let props = Object.assign(
        {
            bpm: 120,
            steps: 48,
            tracks: 8,
            patterns: 4,
            stepJumps: 1,
            follow: true,
            autoStep: false,
            notePreview: true,
            inSongMode: false,
            aSustain: false,
            onNote: (track, freq, duration) =>
                console.log("playing ", freq, " dur: ", duration),
            onTrackSelection: track => console.log("selecting track", track),
            onLoadProject: () => console.log("project loaded")
        },
        options || {}
    );

    let stepRowsNodes = [];

    let isPlaying = false;
    let playTime = 0;
    let playStartTime = 0;
    let playingStep = 0;
    let lastPlayingStep = -1;
    let lastStepTime = 0;

    let selectedTrack = 0;
    let selectedPattern = 0;
    let selectedOctave = 4;
    let selectedStep = 0;
    let songCursor = 0;

    const data = [];
    const gridNodes = [];
    let trackNodes = [];
    let song = [0, 1, 0, 3];

    const notes = [
        { name: "C", key: "a", num: 0 },
        { name: "C#", key: "w", num: 1 },
        { name: "D", key: "s", num: 2 },
        { name: "D#", key: "e", num: 3 },
        { name: "E", key: "d", num: 4 },
        { name: "F", key: "f", num: 5 },
        { name: "F#", key: "t", num: 6 },
        { name: "G", key: "g", num: 7 },
        { name: "G#", key: "y", num: 8 },
        { name: "A", key: "h", num: 9 },
        { name: "A#", key: "u", num: 10 },
        { name: "B", key: "j", num: 11 },
        { name: "STOP", key: "x", num: 12, hideOctave: true }
    ];

    const genKBSvg = () => {
        const w = 268;
        let xcursor = 0;
        const kwidth = w / 8;

        const keys = notes
            .map((note, i) => {
                const y = 0;
                // eslint-disable-next-line no-unused-expressions
                i && note.name.indexOf("#") < 0 ? (xcursor += kwidth) : 0;
                return note.name.indexOf("#") > 0 ?
                    `` :
                    `
                <rect width="${kwidth}"x="${xcursor}" y="${y}" height="80"
                    fill="rgb(255, 255, 255)" stroke="rgb(0, 0, 0);"/>
                <text text-anchor="middle"  x="${
    xcursor + kwidth / 2
}" y="70">${note.key}</text>
          `;
            })
            .join("");

        xcursor = 0;

        const bkeys = notes
            .map((note, i) => {
                const y = 0;
                // eslint-disable-next-line no-unused-expressions
                i && note.name.indexOf("#") < 0 ? (xcursor += kwidth) : 0;
                return note.name.indexOf("#") > 0 ?
                    `
                <rect width="${kwidth / 2}"x="${
    kwidth + (xcursor - kwidth / 4)
}" y="${y}" height="60" fill="rgb(100, 100, 100)" stroke="rgb(0, 0, 0)"/>
                <text text-anchor="middle" fill="#eee" style="fill:#eee" x="${
    kwidth / 2 + (xcursor + kwidth / 2)
}" y="50">${note.key}</text>
              ` :
                    ``;
            })
            .join("");
        // `<?xml version="1.0" encoding="UTF-8" standalone="no"?>

        return          ` <svg
             width="285px"
             height="120px"
             viewBox="0 0 285 120"
             version="1.1"
          >
              ${keys}${bkeys}
          </svg>
        `;
    };

    /* eslint-disable max-len */
    const helpText = `<b>Help is here!</b><br/><br/>
      Each column is a track. Each track has a synth instance. Each row is a step.
      Selecting a track will bring up the synth instance for that track.
            <br/><br/>
      Enter notes in steps using your keyboard as such:
      <br/><br/>
            ${genKBSvg()}<br/>
      Play order is top-to-bottom.

      <br/><br/>
      Use shift+number keys to switch octaves. Space to play. Enter to go to next row.
      Arrow keys or mouse to select a step and track. Backspace or delete to
      clear a step. Space to play/stop. Entering the same note in succession will sustain it if 
          "Sustain successive notes" is ticked. If it's not, notes will sustain until another note is 
          played on the track, or a stop is reached (enter stops with X).
            <br/><br/>
      Auto-stepping makes it so that after entering a note, it will step x steps downwards,
            where x is the number set in the property grid to the right.
            <br/><br/>
            Follow mode makes it so that the grid follows the play marker.
            <br/><br/>
      You can chain up to four patterns. Enter their numbers in the pattern chain
          grid above. Tick "Song mode" to cycle through your chain when playing instead of looping the selected pattern.
      `;
    /* eslint-enable max-len */

    //////////////////////////////////////////////////////////////////////////
    // DOM helpers

    const scrollToOther = (what, to) => (what.scrollTop = to.offsetTop - 200);

    const nodef = (evnt, cb) => {
        // eslint-disable-next-line node/callback-return
        cb();
        evnt.stopPropagation();
        evnt.preventDefault();
        return false;
    };

    const cr = (tp, cssClass, inner) => {
        const e = document.createElement(tp);
        e.innerHTML = inner || "";
        e.className = cssClass || "";
        return e;
    };

    const crf = (tp, inner, funs, classname) => {
        const n = cr(tp, classname, inner);
        Object.keys(funs || {}).forEach(f => {
            n.addEventListener(f, funs[f]);
        });

        if (tp === "input" && typeof inner !== "undefined") {
            n.value = inner;
        }

        return n;
    };

    const ap = (parent, ...children) => {
        children.forEach(c => parent.appendChild(c));
        return parent;
    };

    const stepInput = (track, step) => {
        const inp = crf(
            "div",
            data[selectedPattern][track][step] || "-",
            {
                mousedown: () => {
                    select(track, step);
                }
            },
            "step"
        );

        return inp;
    };

    const propPair = (propName, title, tp) => {
        const lbl = cr("span", "", title);
        const inp = crf("input", "", {
            change: () => {
                props[propName] = tp === "checkbox" ? inp.checked : inp.value;
            }
        });

        inp.type = tp || "text";

        if (tp === "checkbox") {
            inp.checked = props[propName];
        } else {
            inp.value = props[propName];
        }

        return ap(
            cr("table"),
            ap(
                cr("tr"),
                ap(cr("td", "prop-name"), lbl),
                ap(cr("td", "prop-value"), inp)
            )
        );
    };

    const resizeUI = () => {
        const stepWidth = 62;

        rightPanel.style.width = props.tracks * stepWidth + 40 + "px";
    };

    const initGridUI = () => {
        stepRowsNodes = [];
        tbody.innerHTML = "";
        songGridBody.innerHTML = "";
        trackSelection.innerHTML = "";

        for (let i = 0; i < song.length; ++i) {
            ap(
                songGridBody,
                ap(
                    cr("td"),
                    crf("input", song[i] + 1, {
                        // eslint-disable-next-line no-loop-func
                        change: e => {
                            song[i] = wrap(
                                (parseInt(e.target.value, 10) || 1) - 1,
                                song.length
                            );
                            e.target.value = song[i] + 1;
                            return nodef(e, () => {});
                        }
                    })
                )
            );
        }

        for (let j = 0; j < props.steps; ++j) {
            const r = cr(
                "tr",
                "step-row " + (j % 4 === 0 ? "beat-step-row" : "division-step-row")
            );

            stepRowsNodes.push(r);

            ap(r, ap(cr("td"), cr("span", "step-label", j + 1)));

            for (let i = 0; i < props.tracks; ++i) {
                gridNodes[i][j] = stepInput(i, j);
                ap(r, ap(cr("td"), gridNodes[i][j]));
            }

            ap(tbody, r);
        }

        trackNodes = [];
        for (let j = 0; j < props.tracks; ++j) {
            const lbl = crf(
                "span",
                "TRACK " + (j + 1),
                {
                    // eslint-disable-next-line no-loop-func
                    click: () => select(j, selectedStep)
                },
                "track-label"
            );
            trackNodes.push(lbl);
            ap(trackSelection, lbl);
        }

        resizeUI();
    };

    //////////////////////////////////////////////////////////////////////////
    // General helpers

    const calcFreq = (note, octave) =>
        Math.pow(2, (note + octave * 12 - 57) / 12) * 440;

    const wrap = (v, max) => (v >= max ? 0 : v < 0 ? max - 1 : v);

    //////////////////////////////////////////////////////////////////////////
    // Actual guts

    const init = () => {
        // Initialize empty data + tracknodes
        for (let p = 0; p < props.patterns; ++p) {
            const pattern = [];
            for (let t = 0; t < props.tracks; ++t) {
                const track = [];
                const tnodes = [];
                for (let s = 0; s < props.steps; ++s) {
                    track.push(0);
                    tnodes.push(0);
                }
                pattern.push(track);
                gridNodes.push(tnodes);
            }
            data.push(pattern);
        }

        selectedPattern = 0;
        songCursor = 0;
        selectedStep = 0;

        select(0, 0, true);
        selectOctave(4);

        initGridUI();
        rewind();
    };

    const getNoteByPianoIndex = pnote => {
        if (pnote === 90) {
            return {
                note: 12,
                ocatave: 1,
                id: 90
            };
        }

        let octave = Math.floor(pnote / 12);
        const note = pnote % 12;

        octave = octave < 0 ? 0 : octave;

        return {
            freq: calcFreq(note, octave),
            note: note,
            octave: octave,
            id: note + octave * 12
        };
    };

    const addOrDelNoteInSelected = note => {
        const node = gridNodes[selectedTrack][selectedStep];
        if (node) {
            if (!note) {
                data[selectedPattern][selectedTrack][selectedStep] = 0;
                node.innerHTML = "-";
            } else {
                node.innerHTML =
              note.name + (notes[note.num].hideOctave ? "" : selectedOctave);

                const anote = {
                    freq: calcFreq(note.num, selectedOctave),
                    note: note.num,
                    octave: selectedOctave,
                    id: note.num === 12 ? 90 : note.num + selectedOctave * 12
                };

                data[selectedPattern][selectedTrack][selectedStep] = anote;

                if (props.notePreview) {
                    props.onNote(selectedTrack, anote.freq, 500);
                }

                if (props.autoStep) {
                    select(
                        selectedTrack,
                        selectedStep + parseInt(props.stepJumps, 10)
                    );
                    if (props.follow) {
                        scrollToOther(grid, node.parentNode);
                    }
                }
            }
        }
    };

    const loadCurrentPatternInUI = () => {
        patternLabel.innerHTML = "Pattern " + (selectedPattern + 1);
        for (let s = 0; s < props.steps; ++s) {
            for (let t = 0; t < props.tracks; ++t) {
                const node = gridNodes[t][s];
                const note = data[selectedPattern][t][s];
                if (node) {
                    node.innerHTML = note ?
                        notes[note.note].name +
                  (notes[note.note].hideOctave ? "" : note.octave) :
                        "-";
                }
            }
        }
    };

    const select = (newTrack, newStep, scrollTo) => {
        newTrack = wrap(newTrack, props.tracks);
        newStep = wrap(newStep, props.steps);

        const oldNode = gridNodes[selectedTrack][selectedStep];
        const newNode = gridNodes[newTrack][newStep];

        if (trackNodes[selectedTrack]) {
            trackNodes[selectedTrack].className = trackNodes[
                selectedTrack
            ].className.replace(/( track-label-selected)/g, "");
        }

        if (trackNodes[newTrack]) {
            trackNodes[newTrack].className += " track-label-selected";
        }

        if (oldNode) {
            oldNode.className = oldNode.className.replace(/( step-active)/g, "");
        }

        if (newNode) {
            newNode.className += " step-active";
            if (scrollTo) {
                scrollToOther(grid, newNode.parentNode);
            }
        }

        // eslint-disable-next-line eqeqeq
        if (selectedTrack != newTrack) {
            props.onTrackSelection(newTrack);
        }

        selectedTrack = newTrack;
        selectedStep = newStep;

        return true;
    };

    const selectOctave = octave => {
        selectedOctave = octave;
        octaveLabel.innerHTML = "octave: " + octave;
    };

    const selectPattern = newPattern => {
        selectedPattern = wrap(newPattern, props.patterns);
        loadCurrentPatternInUI();
    };

    const updatePlayMarker = () => {
        if (lastPlayingStep >= 0) {
            stepRowsNodes[lastPlayingStep].className = stepRowsNodes[
                lastPlayingStep
            ].className.replace(/( playing-step)/g, "");
        }

        stepRowsNodes[playingStep].className += " playing-step";

        if (props.follow) {
            scrollToOther(grid, stepRowsNodes[playingStep]);
        }
    };

    const togglePlay = () => {
        isPlaying = !isPlaying;

        if (isPlaying) {
            playStartTime = new Date().getTime();
            lastStepTime = 0;
            playButton.innerHTML = "Stop";
        } else {
            playButton.innerHTML = "Play";
        }
    };

    const rewind = () => {
        updatePlayMarker(); // remove old marker
        lastStepTime = 0;
        lastPlayingStep = playingStep;
        playingStep = 0;
        if (!isPlaying) {
            updatePlayMarker();
        }
    };

    const process = () => {
        if (isPlaying) {
            const stepsPerMs = 60000 / props.bpm / 4;
            playTime = new Date().getTime() - playStartTime;

            if (playTime - lastStepTime > stepsPerMs) {
                lastStepTime = playTime;

                updatePlayMarker();

                // Check for note events in data array
                for (let t = 0; t < props.tracks; ++t) {
                    if (data[selectedPattern][t][playingStep]) {
                        // Call the play event
                        const note = data[selectedPattern][t][playingStep];

                        if (note.id !== 90) {
                            note.duration = stepsPerMs;

                            // This should be calculated on note add.

                            const pnote =
                                data[selectedPattern][t][playingStep - 1];
                            if (
                                props.aSustain &&
                                (!pnote || note.id !== pnote.id)
                            ) {
                                for (
                                    let i = playingStep + 1;
                                    i < props.steps;
                                    ++i
                                ) {
                                    if (data[selectedPattern][t][i].id ===
                                        note.id) {
                                        note.duration += stepsPerMs;
                                    } else {
                                        break;
                                    }
                                }
                            } else if (!props.aSustain) {
                                // Go until we hit *any* note.
                                for (
                                    let i = playingStep + 1;
                                    i < props.steps;
                                    ++i
                                ) {
                                    if (!data[selectedPattern][t][i]) {
                                        note.duration += stepsPerMs;
                                    } else {
                                        break;
                                    }
                                }
                            }
                            props.onNote(t, note.freq, note.duration);
                        }
                    }
                }

                lastPlayingStep = playingStep;
                ++playingStep;
                if (playingStep >= props.steps) {
                    if (props.inSongMode) {
                        songCursor = wrap(songCursor + 1, song.length);
                        selectPattern(song[songCursor]);
                    }
                    playingStep = 0;
                }
            }
        }

        requestAnimationFrame(process);
    };

    //////////////////////////////////////////////////////////////////////////
    // Serialization (aka Really Silly Compression Stuff)
    // While run length encoding is fairly viable for certain data, this
    // implementation is really bad & naive.

    // <num>_<repeats>!... | <num>! for one occurence

    const rle = () => {
        const str = [];

        const steps = [];

        // Two passes so we can compress an entire track accross patterns.
        for (let t = 0; t < props.tracks; ++t) {
            for (let p = 0; p < props.patterns; ++p) {
                for (let i = 0; i < props.steps; ++i) {
                    steps.push(data[p][t][i] ? data[p][t][i].id + 1 : 0);
                }
            }
        }

        for (let i = 0; i < steps.length; ++i) {
            const c = steps[i];
            let count = 1;

            for (; steps[i] === steps[i + 1] && i < steps.length; ++i) {
                ++count;
            }

            str.push(count > 1 ? c + "_" + count : c);
        }

        return str.join("!");
    };

    const rld = str => {
        const res = [];
        str.split("!").forEach(b => {
            const pair = b.split("_");
            const count = parseInt(pair[1], 10) || 1;
            for (let i = 0; i < count; ++i) {
                res.push(parseInt(pair[0], 10));
            }
        });

        return res;
    };


    const toCompressedStr = additionalData =>
        btoa(
            JSON.stringify({
                options: props,
                song,
                ad: additionalData,
                data: rle()
            })
        );

    const fromCompressedStr = str => {
        const obj = JSON.parse(atob(str));

        props = Object.assign(props, obj.options);
        song = obj.options.song || song;

        init();

        // Unpack the data array
        const a = rld(obj.data);

        for (let t = 0; t < props.tracks; ++t) {
            for (let p = 0; p < props.patterns; ++p) {
                for (let s = 0; s < props.steps; ++s) {
                    const n = a[
                        s + p * props.steps + t * props.steps * props.patterns
                    ];
                    data[p][t][s] = !n ? 0 : getNoteByPianoIndex(n - 1);
                }
            }
        }

        loadCurrentPatternInUI();

        props.onLoadProject(props.ad);
    };

    //////////////////////////////////////////////////////////////////////////
    // Event listeners for hotkeys

    // Keyboard keyboard
    document.body.addEventListener("keydown", e =>
        notes.forEach(note =>
            (e.key === note.key ? addOrDelNoteInSelected(note) : true)
        )
    );

    // Octave switches
    document.body.addEventListener("keydown", e =>
        (e.keyCode >= 48 && e.keyCode <= 56 && e.shiftKey ?
            selectOctave(e.keyCode - 48) :
            false)
    );

    // General hotkeys
    document.body.addEventListener(
        "keydown",
        e =>
            [
                [32, togglePlay],
                [13, () => select(selectedTrack, selectedStep + 1, 1)],
                [37, () => select(selectedTrack - 1, selectedStep, 1)],
                [38, () => select(selectedTrack, selectedStep - 1, 1)],
                [39, () => select(selectedTrack + 1, selectedStep, 1)],
                [40, () => select(selectedTrack, selectedStep + 1, 1)],
                [8, () => addOrDelNoteInSelected(false)],
                [46, () => addOrDelNoteInSelected(false)]
            ].forEach(p => (e.keyCode === p[0] ? nodef(e, p[1]) : false)),
        false
    );

    ////////////////////////////////////////////////////////////////////////
    // DOM mess ahead.

    const target = document.getElementById(id);
    const grid = cr("div", "grid");
    const tbody = cr("tbody");
    const octaveLabel = cr("div", "octave-label", "oct: " + selectedOctave);
    const patternLabel = cr("span", "pattern-label", "Pattern 1");
    const songGridBody = cr("tr");
    const rightPanel = cr("div", "right");
    const trackSelection = cr("div", "track-selection");

    const playButton = crf(
        "button",
        "Play",
        {
            click: togglePlay
        },
        "play-button"
    );

    ap(
        target,
        ap(
            cr("div", "left"),
            ap(cr("div", "grid-footer"), cr("div", "help-text", helpText)),
            crf("button", "test", {
                click: () => {
                    const t = toCompressedStr();
                    console.log(t);
                    console.log(fromCompressedStr(t));
                }
            })
        ),
        ap(
            rightPanel,
            ap(cr("div", "grid-header"), cr("h2", "", "Hightrack")),
            ap(
                cr("div", "grid-header"),
                ap(
                    cr("div", "play-controls"),
                    playButton,
                    crf("button", "Rewind", {
                        click: rewind
                    })
                )
            ),

            trackSelection,
            ap(grid, ap(cr("table"), tbody)),
            ap(
                cr("div", "grid-footer"),

                ap(
                    cr("div", "pattern-controls"),
                    crf(
                        "button",
                        "<",
                        {
                            click: () => selectPattern(selectedPattern - 1)
                        },
                        "prev-pattern"
                    ),
                    patternLabel,
                    crf(
                        "button",
                        ">",
                        {
                            click: () => selectPattern(selectedPattern + 1)
                        },
                        "next-pattern"
                    )
                ),

                ap(
                    cr("div", "options"),
                    propPair("bpm", "BPM"),
                    propPair("stepJumps", "Steps to jump when auto stepping"),
                    propPair("follow", "Follow", "checkbox"),
                    propPair("autoStep", "Auto step after add", "checkbox"),
                    propPair("notePreview", "Preview new notes", "checkbox"),
                    propPair("aSustain", "Sustain successive notes", "checkbox"),
                    propPair("inSongMode", "Song mode", "checkbox"),

                    octaveLabel
                )
            ),
            ap(
                cr("div", "grid-footer"),
                cr("h3", "", "Song Pattern Chain"),
                ap(cr("table"), songGridBody)
            )
        )
    );

    //////////////////////////////////////////////////////////////////////////

    init();
    process();

    // Public API
    return {
        togglePlay,
        select,
        selectPattern,
        selectOctave,
        addOrDelNoteInSelected,
        toCompressedStr,
        fromCompressedStr
    };
};

Tracker('tracker', {
    tracks: defTracks,
    onTrackSelection: track => {
        if (synthEditor) {
            synthEditor.setActiveSynth(track);
        }
    },
    onNote: (track, freq, dur) => {
        if (synths.length) {
            synths[track].playFreqAtTime(0, freq, dur);
        }
    }
});
