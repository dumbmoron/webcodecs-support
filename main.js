
const load = async url => fetch(url).then(a => a.json());
const dunce = navigator.userAgent.includes('Firefox');

const supportsCodec = async (type, data) => {
    try {
        const result = await window[type].isConfigSupported(data);
        if (result.supported) {
            return true;
        }
    } catch {}

    return false;
}

const getManualResolution = () => {
    const w = +document.querySelector('.video-width').value;
    const h = +document.querySelector('.video-height').value;

    if (w && h && !isNaN(w) && !isNaN(h))
        return [w, h];
}

const supportsVideoCodec = async (codec) => {
    const manual = getManualResolution();
    const resolutions = manual ? [ manual ] : [[1, 1], [64, 64], [640, 360], [1920, 1080]];

    const supports = {};
    for (const type of [ 'VideoDecoder', 'VideoEncoder' ]) {
        supports[type] = false;
        if (codec === 'avc3.42001E' && dunce) {
            continue;
        }


        for (const [ width, height ] of resolutions) {
            try {
                const ok = await supportsCodec(type, { codec, width, height });

                if (ok) {
                    supports[type] = true;
                    break;
                }
            } catch {
                supports[type] = null;
            }
        }
    }

    return supports;
}

const supportsAudioCodec = async (codec) => {
    const sampleRates = [16000, 22050, 44100, 48000];

    const supports = {};
    for (const type of [ 'AudioDecoder', 'AudioEncoder' ]) {
        supports[type] = false;

        for (const sampleRate of sampleRates) {
            try {
                const ok = await supportsCodec(type, {
                    codec, sampleRate, numberOfChannels: 2
                });

                if (ok) {
                    supports[type] = true;
                    break;
                }
            } catch {}
        }
    }

    return supports;
}

const compute = async () => {
    const probe = (group, prober) => {
        return load(`./codecs/${group}.json`).then(codecs => {
            return Promise.all(
                codecs.map(async codec => {
                    return { codec, supports: await prober(codec) }
                })
            ).then(res => {
                res.sort((a, b) => {
                    const score_a = Object.values(a.supports).reduce((a, b) => a + b);
                    const score_b = Object.values(b.supports).reduce((a, b) => a + b);
                    const diff = score_b - score_a
                    const length_diff = a.codec.length - b.codec.length;

                    if (diff) return diff;
                    if (length_diff) return length_diff;
                    return b.codec.localeCompare(a.codec);
                });
                return res;
            });
        });
    }

    const results = {
        audio: await probe('audio', supportsAudioCodec),
        'video-avc1': await probe('video-avc1', supportsVideoCodec),
        'video-rest': await probe('video-rest', supportsVideoCodec),
    };

    return results;
};