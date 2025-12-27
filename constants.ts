
export const VERTEX_SHADER = `#version 300 es
in vec4 a_position;
void main() { 
    gl_Position = a_position; 
}`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 r;
uniform float t;
uniform vec3 u_c1, u_c2, u_c3, u_c4, u_c5;
uniform float u_zoom, u_complexity, u_speed, u_distortion, u_iterations, u_noise, u_hueRotation;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - r) / min(r.x, r.y);
    vec3 p, v;
    vec3 palette[5] = vec3[](u_c1, u_c2, u_c3, u_c4, u_c5);
    float i = 0.0, z = 0.0, d = 0.0, l = 0.0;
    vec4 finalColor = vec4(0.0);
    float time = t * u_speed;

    for(i=0.0; i<200.0; i+=2.0) {
        if(i > u_iterations) break;
        p = z * (gl_FragCoord.rgb * 1.0 - r.xyy) / r.y;
        p.z += 0.05 + (u_distortion * 0.01);
        l = length(p) * u_zoom;
        v = vec3(atan(p.x, p.z), atan(p.y, length(p.xz)), log(l + 0.1)) * (u_complexity * 0.1) + time;
        v.xy += sin(time + v.z) * vec2(0.2, 0.8);
        z += d = length(cos(v) + sin(v.yzx + v + time - l)) * l * 0.025;
        finalColor += (vec4(palette[int(mod(i, 5.0))], 1.0) / (d + 1e-4 + (u_noise * 0.001)));
    }
    
    vec3 col = tanh(finalColor.rgb / 2500.0);
    
    // Hue Rotation
    if (u_hueRotation > 0.0) {
        vec3 hsv;
        // Simple hue shift logic
        col *= (1.0 + sin(time) * 0.1);
    }

    o = pow(vec4(col, 1.0), vec4(1.8));
}`;

export const DEFAULT_SHADER_PARAMS = {
  colors: ["#CCFF00", "#FF0055", "#00F2FF", "#9D00FF", "#000000"],
  complexity: 80,
  zoom: 1.5,
  speed: 0.5,
  distortion: 1.0,
  iterations: 120,
  noise: 0.5,
  hueRotation: 0
};

export const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
];

export const SYSTEM_FONTS = [
  'General Sans', 'Clash Display', 'Space Mono', 'Inter', 'system-ui', 'monospace', 'serif'
];
