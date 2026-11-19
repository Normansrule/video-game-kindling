// engine/3d/character.js
// WHAT: A ready-to-use animated blocky character for 3D games: upload its parts once,
//       then each frame call character.queue(renderer, position, yaw, walkCycle) and
//       it swings its arms and legs as it walks.
// WHY:  Animation does not need bones or a file format. Each limb is its own mesh
//       hanging from a pivot (shoulder or hip); swinging it is one rotation matrix:
//           model = moveTo(body) * turn(yaw) * moveTo(pivot) * swing(angle)
//       Read right to left: swing the limb around its pivot, put the pivot on the
//       body, turn the whole body, then move the body into the world.
// DOC:  docs/modules/3d-stylized.md (section "An animated character")

import { blockyCharacter } from "./lowpoly.js";
import { characterParts } from "../characters/character-model.js";
import * as mat4 from "../math/mat4.js";

// look: EITHER a character spec from the character designer ({ skin: "#f2c48d", hat: "cap", ... },
// see characters/character-spec.js) OR plain colors { skin, shirt, pants, shoes } as [r, g, b] 0..1.
export function createCharacter(renderer, look) {
  const isSpec = look && typeof look.skin === "string";
  const parts = isSpec ? characterParts(look) : blockyCharacter(look);
  const specScale = isSpec && look.height ? look.height : 1;
  const meshes = {};
  for (const name in parts) meshes[name] = { mesh: renderer.createModel(parts[name].data), pivot: parts[name].pivot };

  // position: feet { x, y, z }. yaw: 0 faces north (-z). walkCycle: grows while walking
  // (radians; 0 = standing still). tint: optional color multiplier.
  function queue(position, yaw, walkCycle = 0, tint = [1, 1, 1], scale = 1) {
    const swing = Math.sin(walkCycle) * 0.7;
    const bob = Math.abs(Math.sin(walkCycle)) * 0.06;
    // The model is built facing +z, so turn it half a circle to face north at yaw 0.
    const body = mat4.multiply(
      mat4.translation(position.x, position.y + bob, position.z),
      mat4.multiply(mat4.rotationY(yaw + Math.PI), mat4.scaling(scale * specScale, scale * specScale, scale * specScale)),
    );
    const swings = { leftArm: swing, rightArm: -swing, leftLeg: -swing, rightLeg: swing, torso: 0, head: 0 };
    for (const name in meshes) {
      const part = meshes[name];
      const local = mat4.multiply(mat4.translation(part.pivot[0], part.pivot[1], part.pivot[2]), mat4.rotationX(swings[name]));
      renderer.queueModel(part.mesh, mat4.multiply(body, local), tint);
    }
  }

  // Free the GPU meshes, e.g. before building a new look in a character designer.
  function destroy() {
    for (const name in meshes) meshes[name].mesh.destroy();
  }

  return { queue, destroy };
}
