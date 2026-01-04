# Contact Info Obfuscation Reference

**DO NOT COMMIT THIS FILE TO PUBLIC REPOS**

## How It Works

Contact info is encoded using a key-based shift cipher. The key is derived from 7 strings scattered throughout App.tsx.

## Key Components (in order)

| Variable | Value | Location | Char Used |
|----------|-------|----------|-----------|
| `_css1` | "visibility" | Near imports | [0] = 'v' |
| `_css2` | "Keyframes" | Near imports | [0] = 'K' |
| `_attr` | "9rem" | After projects array | [0] = '9' |
| `_prop` | "boxShadow" | After projects array | [2] = 'x' |
| `_anim` | "Quantum" | Near imports | [0] = 'Q' |
| `_unit` | "2px" | Near imports | [0] = '2' |
| `_mode` | "maxHeight" | Before decode function | [0] = 'm' |

## Key Assembly

```js
const _k = _css1[0] + _css2[0] + _attr[0] + _prop[2] + _anim[0] + _unit[0] + _mode[0];
// Result: "vK9xQ2m"
```

## Decode Function

```js
const decode = (codes: number[]): string => {
  return codes
    .map((code, i) => {
      const shift = (_k.charCodeAt(i % _k.length) % 13) + 1;
      return String.fromCharCode(code - shift);
    })
    .join("");
};
```

## Encoded Values

```js
email1: [108, 128, 121, 120, 109, 122, 52, 124, 57, 125, 105, 109, 76, 117, 119, 127, 114, 115, 115, 119, 52, 101, 122, 115]
// -> justin.z.wei@outlook.com

email2: [108, 133, 125, 56, 68, 127, 108, 119, 57, 105, 101]
// -> jzw4@sfu.ca

phone: [42, 66, 61, 60, 45, 44, 62, 55, 67, 51, 61, 61, 60, 63]
// -> (778) 858-9909

phoneHref: [45, 60, 61, 59, 60, 68, 59, 58, 68, 63, 52, 61]
// -> +17788589909

github: [108, 56, 128, 49, 123]
// -> j-z-w
```

## To Re-encode (if contact info changes)

```js
const key = "vK9xQ2m";

const encode = (str) => {
  return str.split('').map((c, i) => {
    const shift = (key.charCodeAt(i % key.length) % 13) + 1;
    return c.charCodeAt(0) + shift;
  });
};

console.log(encode('your.new.email@example.com'));
```
