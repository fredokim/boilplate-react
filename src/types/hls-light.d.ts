// hls.js ships types for its main entry but not for the ./light subpath, which resolves
// to the same class with subtitle, alternate-audio, and EME support compiled out.
declare module 'hls.js/light' {
  import Hls from 'hls.js';

  export default Hls;
}
