import assert from 'node:assert/strict';
import * as fs from 'fs';

//title: Minimal sweater pattern
/** Conventions: 
 * knit in the negative direction on front bed
 * knit in the positive direction on back bed
 * even number needles on the front, so the max needle is on the front
 * odd needles on the back, the min needle is on the back
 * left and right refer to position while facing the machine, but in reality are reversed on the actual product
 */

//Write header:
console.log(';!knitout-2');
console.log(';;Machine: SWGN2');
console.log(';;Carriers: 1 2 3 4 5 6 7 8 9 10');

import * as sh from "./sweater_helpers.mjs";

//----------------
/* SWATCH CONVERSIONS */
//This should be something that the user can enter
//----------------

function width_cm_to_needles(width, pattern) {
    let conversion = 100/15.625; //for jersey/stockinette
    switch (pattern) {
        case 'g': conversion = 100/15; break;  
        case 's': conversion = 64/10.2; break;
    }
    return Math.ceil(((conversion)*width)/4.0) * 4;
}

function length_cm_to_rows(len, pattern) {
    let conversion = 100/18.75; //for jersey/stockinette
    switch (pattern) {
        case 'g': conversion = 100/9.8; break;
        case 's': conversion = 64/8.3; break;
        case 'r': conversion = 64/9.8; break;
    }
    return Math.ceil(((conversion)*len)/2.0) * 2;
}

const max_stretch = 0.45; //percent increase in length when stretching

//----------------
/* MEASUREMENTS */
//mostly conversions
//----------------

//load measurements from json file into object
let rawdata = fs.readFileSync('measurements.json');
let m = JSON.parse(rawdata);

let stitch_pattern = m.stitch_pattern;

for (let i = 0; i < m.body_measurements.length; i++) {
    m.body_measurements[i][0] = width_cm_to_needles(m.body_measurements[i][0]);
    m.body_measurements[i][1] = length_cm_to_rows(m.body_measurements[i][1]);
}

let body_measurements = m.body_measurements;

for (let i = 0; i < m.sleeve_measurements.length; i++) {
    m.sleeve_measurements[i][0] = width_cm_to_needles(m.sleeve_measurements[i][0]);
    m.sleeve_measurements[i][1] = length_cm_to_rows(m.sleeve_measurements[i][1]);
}

let sleeve_measurements = m.sleeve_measurements;

//separate the hem from the body measurements. Ensure that first body measurement is longer than rib length.
let hem_width = width_cm_to_needles(m.hem_width_cm, stitch_pattern);
let hem_riblen = length_cm_to_rows(m.hem_riblen_cm, 'r');
if (hem_riblen > body_measurements[0][1]) {
    console.error("hem rib longer than body sleeve measurement");
}
body_measurements[0][1] -= hem_riblen; 

//convert bust measurements and account for how much of the added length is expected to be taken care of by fabric stretchiness
let bust_start = length_cm_to_rows(m.hem_to_underbust_cm, stitch_pattern);
bust_start -= hem_riblen;
let bustlen = length_cm_to_rows(m.underbust_to_overbust_cm, stitch_pattern);
let bust_end = bust_start + bustlen;
let bustlen_front = bustlen + length_cm_to_rows(m.front_back_bust_diff_cm, stitch_pattern);
let stretch = 1 + (m.bust_stretch * max_stretch);
let front_back_bust_diff = sh.round2(bustlen_front/stretch) - bustlen;
let bust_separation = width_cm_to_needles(m.bust_separation_cm, stitch_pattern);
let bust_radius = width_cm_to_needles(m.bust_radius_cm, stitch_pattern);

//declare global variables for later use
let left_bustpoint;
let right_bustpoint;

//treat wrist rib length the same as the hem rib above
let wrist_width = width_cm_to_needles(m.wrist_width_cm, stitch_pattern);
let wrist_riblen = length_cm_to_rows(m.wrist_riblen_cm, 'r');
if (wrist_riblen > sleeve_measurements[0][1]) {
    console.error("wrist rib longer than first sleeve measurement");
} 
sleeve_measurements[0][1] -= wrist_riblen; //rib included in measurements

//measure the width according to the back of the neck. 
let neck_width = width_cm_to_needles(m.neck_width_cm, stitch_pattern);
let neck_riblen = length_cm_to_rows(m.neck_riblen_cm, 'r');
//neck_depth_percentage gives how deep the user wants the neckline as a percentage from min to max depth
let neck_depth = sh.round2(Math.ceil((neck_width-16)/2)*(0.5+(m.neck_depth_percentage/2)));
let neckline_base_width = 0; 

//how many needles wide the armhole gusset should be
let sleeve_gap = 6; //6 needles on front, 6 needles on back, 6 each used (1/2 gauge)

//armhole offset and effect on body lengths
let armhole_offset = length_cm_to_rows(m.armhole_offset_cm, stitch_pattern);
sleeve_measurements[sleeve_measurements.length-1][1] -= armhole_offset; 
body_measurements[body_measurements.length-1][1] -= armhole_offset; 

//calculate length for shoulders taking into account stretch
let shoulder_length = length_cm_to_rows(m.inner_bicep_to_neck_cm, stitch_pattern)
stretch = 1 + (m.shoulder_stretch * max_stretch);

let shoulder_depth = length_cm_to_rows(m.neck_to_shoulder_depth_cm, stitch_pattern);
let shoulder_width = width_cm_to_needles(m.shoulder_width_cm, stitch_pattern);
let armhole_to_shoulder = length_cm_to_rows(m.shoulder_to_armhole_depth_cm, stitch_pattern) + armhole_offset;
//derived measurements to separate the loops later in the code as the neckline requires c-knitting
let shoulder_to_neckline = shoulder_depth - neck_depth - neck_riblen;
let armhole_to_neckline = armhole_to_shoulder + shoulder_to_neckline;
let armhole_depth = shoulder_depth + armhole_to_shoulder;
let shoulder_short_rows = Math.max(0,sh.round2(shoulder_length/stretch) - (armhole_depth - armhole_offset));

//style preferences. Different carriers are used if the components are intended to be of different colours
let raglan_style = m.raglan_style;
let include_bust = m.include_bust;
let body_carrier = m.body_carrier;
let left_sleeve_carrier = m.left_sleeve_carrier;
let right_sleeve_carrier = m.right_sleeve_carrier;
let yoke_carrier = m.yoke_carrier;
let width_change_stitches = m.width_change_stitches;
//----------------
/* KNIT BODY AND SLEEVES */
//----------------

let body_min = 1; //needle number of left edge for the body. Could be any odd number to maintain convention.
let body_max = body_min + hem_width - 1; //needle number of right edge
let body_ks = new sh.KnittingState(body_min, body_max, 0, stitch_pattern, body_carrier); //initializes ks object
let body_tube = sh.width_changing_segments(sh.get_current_width(body_ks), true, body_measurements);
let body_min_final = body_min;
let body_max_final = body_max;

//decide how to space out the bust short rows
let bustrows = [];
let bust_added_length = 0;
if (include_bust) {
    //populate an array with information about bust dart endpoints and when to short row
    bustrows = sh.horizontal_bust_dart(bustlen, front_back_bust_diff);

    for (let i = 0; i < bustrows.length; i++) {
        let body_index = i+bust_start;
        if (bustrows[i][0]) {
            bust_added_length++;
            if (body_tube[body_index] == 'i') {
                //avoid adding short rowing on the same row as an increase to simplify the code/knitting
                body_tube[body_index] = 'n';
                body_tube[body_index-1] = 'i';
            }
        }
    }
}

//add some decreases at the top of the body tube 
//to compensate for the added width from the gusset
//and to avoid excess fabric bunching
for (let i = Math.floor(body_tube.length-sleeve_gap/2); i < body_tube.length; i++)
    body_tube[i] = 'd';

//find final start and end points of the body tube
for (let i = 0; i < body_tube.length; i++) {
    switch (body_tube[i]) {
        case 'i': 
            body_max_final+=2;
            body_min_final-=2;
            break;
        case 'd': 
            body_max_final-=2;
            body_min_final+=2;
            break;
        default: break;
    }
}

//find endpoints of left sleeve based on body tube and measurements
let left_sleeve_max = body_min_final - sleeve_gap - 1;
let left_sleeve_min = left_sleeve_max - wrist_width + 1;
let left_sleeve_ks = new sh.KnittingState(left_sleeve_min, left_sleeve_max, 0, stitch_pattern, left_sleeve_carrier);
let ls_tube = sh.width_changing_segments(sh.get_current_width(left_sleeve_ks), false, sleeve_measurements);
let ls_min_final = left_sleeve_min;
for (let i = 0; i < ls_tube.length; i++) {
    switch (ls_tube[i]) {
        case 'i': 
            ls_min_final-=2;
            break;
        case 'd': 
            ls_min_final+=2;
            break;
        default: break;
    }
}

//find endpoints of right sleeve based on body tube and measurements
let right_sleeve_min = body_max_final + sleeve_gap + 1;
let right_sleeve_max = right_sleeve_min + wrist_width - 1;
let right_sleeve_ks = new sh.KnittingState(right_sleeve_min, right_sleeve_max, 0, stitch_pattern, right_sleeve_carrier);
let rs_tube = sh.width_changing_segments(sh.get_current_width(right_sleeve_ks), false, sleeve_measurements);
let rs_max_final = right_sleeve_max;

for (let i = 0; i < rs_tube.length; i++) {
    switch (rs_tube[i]) {
        case 'i': 
            rs_max_final+=2;
            break;
        case 'd': 
            rs_max_final-=2;
            break;
        default: break;
    }
}

//adjust the row counter for the body based on the bust short rows and the difference in the sleeve length and body length
let bodylen_offset = rs_tube.length - (body_tube.length + bust_added_length);
body_ks.row += bodylen_offset;

//start knitting the body. Begin with the cast on and the hem rib.
sh.cast_on_and_rib(body_ks, 1, 1, hem_riblen);

//add a spacer loop after the complexity of the transfers in the rib
sh.one_tube_row(body_ks, true);
//build the body
if (include_bust) {

    //calculate the left and right bust points based on the separation measurement and the current knitting state/
    left_bustpoint = sh.round2(body_ks.min + sh.get_current_width(body_ks)/2 - bust_separation/2) - bust_radius;
    right_bustpoint = sh.round2(left_bustpoint+bust_separation) + bust_radius;

    for (let i = 0; i < body_tube.length; i++) {
        
        if (body_tube[i] == 'i') {
            //increase row
            if (i >= bust_start && i < bust_end && bustrows[i-bust_start][0]) {
                console.error("shouldn't have bust row on increase row");
            } else {
                sh.tube_all_increase_row(body_ks, width_change_stitches);
            }
        } else {
            //decrease row or regular row, have to account for bust dart
            if (body_tube[i] == 'd') 
                sh.tube_all_decrease(body_ks, width_change_stitches, width_change_stitches, false);

            //check that array access is safe for bustrows and then check if short rowing is to be done for the current row
            if (i >= bust_start && i < bust_end && bustrows[i-bust_start][0]) {

                //find the endpoints of the bust dart
                let j = i-bust_start;
                let bustdart_left = sh.round2(body_ks.min + bustrows[j][1]*(left_bustpoint-body_ks.min));
                let bustdart_right = sh.round2(body_ks.max - bustrows[j][1]*(body_ks.max-right_bustpoint));
                sh.short_row_front(body_ks, body_ks.max, bustdart_left, bustdart_right, body_ks.min);
                sh.knit_back(body_ks.min, body_ks.max, body_ks);
                body_ks.row++;
            } else {
                sh.one_tube_row(body_ks);
            }
        }
    }
} else {
    //No added complexities if there is no bust short rowing
    for (let i = 0; i < body_tube.length; i++) {
        sh.execute_row(body_ks, 'A', body_tube[i], width_change_stitches);
    }
}

//knits to the middle of the tube to prevent outhook hole at underarm
sh.knit_front(body_ks.max, body_ks.max-12, body_ks);
console.log(`outhook ${body_ks.carrier}`);    

//left sleeve
sh.cast_on_and_rib(left_sleeve_ks, 1, 1, wrist_riblen);
for (let i = 0; i < ls_tube.length; i++) {
    sh.execute_row(left_sleeve_ks, 'L', ls_tube[i], width_change_stitches);
}

//knits to the middle of the tube to prevent outhook hole at underarm
sh.knit_front(left_sleeve_ks.max, left_sleeve_ks.max-12, left_sleeve_ks);
console.log(`outhook ${left_sleeve_ks.carrier}`);

//right sleeve
sh.cast_on_and_rib(right_sleeve_ks, 1, 1, wrist_riblen);
for (let i = 0; i < rs_tube.length; i++) {
    sh.execute_row(right_sleeve_ks, 'R', rs_tube[i], width_change_stitches);
}

//number of needles shifted at once during internal decrease after sleeve join
//the initial number of stitches decreased is the final width of the bicep
let final_sleeve_width = sleeve_measurements[(sleeve_measurements.length-1)][0];

//----------------
/* BODY AND SLEEVE JOIN */
//----------------

//set the carrier in the knitting state
body_ks.carrier = yoke_carrier;

//outhook the right sleeve carrier if it is different to the yoke carrier, and inhook the yoke carrier
if (right_sleeve_ks.carrier != yoke_carrier) {

    console.log(`outhook ${right_sleeve_ks.carrier}`);

    console.log(`inhook ${yoke_carrier}`);
    for (let i = right_sleeve_ks.max - 7; i < right_sleeve_ks.max; i++) {
        if (i % 2 != 0)
            console.log(`tuck + b${i} ${yoke_carrier}`);
    }
    console.log(`releasehook ${yoke_carrier}`);
} 

//knits to the right sleeve join location
sh.knit_front(right_sleeve_ks.max, right_sleeve_ks.min + 1, body_ks);
console.log(`knit - b${right_sleeve_ks.min} ${sh.carr(body_ks, `b`, right_sleeve_ks.min)}`);

//create the armhole gussets
//twisted tucks over the sleeve gap in a zigzag pattern (tuck in + direction while moving in - direction)
//kind of like a twisted tuck cast on
for (let i = right_sleeve_ks.min-1; i > body_ks.max; i--) {
    if (i % 2 != 0) {
        console.log(`tuck + b${i} ${sh.carr(body_ks, `b`, i)}`);
    } else {
        console.log(`tuck + f${i} ${sh.carr(body_ks, `f`, i)}`);
    }
}

//repeat process for gusset at left sleeve join location
sh.knit_front(body_ks.max, body_ks.min + 1, body_ks);
console.log(`knit - b${body_ks.min} ${sh.carr(body_ks, `f`, body_ks.min)}`);
for (let i = body_ks.min-1; i > left_sleeve_ks.max; i--) {
    if (i % 2 != 0) {
        console.log(`tuck + b${i} ${sh.carr(body_ks, `b`, i)}`);
    } else {
        console.log(`tuck + f${i} ${sh.carr(body_ks, `f`, i)}`);
    }
}
sh.knit_front(left_sleeve_ks.max, left_sleeve_ks.min, body_ks);

sh.knit_back(left_sleeve_ks.min, left_sleeve_ks.max - 1, body_ks);
console.log(`knit + f${left_sleeve_ks.max} ${sh.carr(body_ks, `f`, left_sleeve_ks.max)}`);
//knit over the tucked stitches -- knit in same direction as motion
for (let i = left_sleeve_ks.max + 1; i < body_ks.min; i++) {
    if (i % 2 != 0) {
        console.log(`knit + b${i} ${sh.carr(body_ks, `b`, i)}`);
    } else {
        console.log(`knit + f${i} ${sh.carr(body_ks, `f`, i)}`);
    }
}
sh.knit_back(body_ks.min, body_ks.max - 1, body_ks);
console.log(`knit + f${body_ks.max} ${sh.carr(body_ks, `f`, body_ks.max)}`);
for (let i = body_ks.max + 1; i < right_sleeve_ks.min; i++) {
    if (i % 2 != 0) {
        console.log(`knit + b${i} ${sh.carr(body_ks, `b`, i)}`);
    } else {
        console.log(`knit + f${i} ${sh.carr(body_ks, `f`, i)}`);
    }
}
sh.knit_back(right_sleeve_ks.min, right_sleeve_ks.max, body_ks);

//everything has been joined into one tube, so we update overall min and max
body_ks.row++;
body_ks.min = left_sleeve_ks.min;
body_ks.max = right_sleeve_ks.max;

//----------------
/* YOKE CONSTRUCTION */
//----------------

//calculate when short rows are required for excess shoulder length

//shoulder shortrows before the neckline
let shoulder_shorts_1 = Math.ceil(shoulder_short_rows * (armhole_to_neckline/(neck_depth + armhole_to_neckline)));
//shoulder shortrows at the neckline
let shoulder_shorts_2 = shoulder_short_rows - shoulder_shorts_1;

//check that there aren't too many short rows
assert(shoulder_shorts_1 < armhole_to_neckline, "too many short rows");
//neck_depth is divided by 3 instead of 2 to prevent short rows too close to the neck rib
assert(shoulder_shorts_2 < neck_depth/3, "too many short rows");

//create arrays which specify at which rows to add short rows
let short_rows_1 = sh.array_with_spaced_instructions(armhole_to_neckline, shoulder_shorts_1, true, false);
let short_rows_2 = sh.array_with_spaced_instructions(neck_depth/3, shoulder_shorts_2, true, false);

//current width with arms
let armhole_to_shoulder_decreases = sh.get_current_width(body_ks) - shoulder_width;

//calculate how many of decreases will be done up to the shoulder. This should remove excess fabric at armhole.
//calculate minimum number of decreases per row
let base_decreases_1 = 0;
if (armhole_to_shoulder_decreases > 4*armhole_to_shoulder) {
    base_decreases_1++;
    armhole_to_shoulder_decreases -= 4*armhole_to_shoulder;
}
//array to specify spaced out arrangement of remaining decreases
let shoulder_decrease_rows_1 = sh.width_changing_tube(true, armhole_to_shoulder_decreases, 'd', armhole_to_shoulder);

//similar calculations to above. Decrease from shoulder width to neck width
let shoulder_to_neck_decreases = shoulder_width - neck_width;
let shoulder_to_neck = shoulder_depth - neck_riblen;
let base_decreases_2 = 0;
if (shoulder_to_neck_decreases > 4*shoulder_to_neck) {
    base_decreases_2++;
    shoulder_to_neck_decreases -= 4*shoulder_to_neck;
}
assert(shoulder_to_neck_decreases <= shoulder_to_neck*4, "shoulder too steep");
let shoulder_decrease_rows_2 = sh.width_changing_tube(true, shoulder_to_neck_decreases, 'd', shoulder_to_neck);

//base measurements for roughly how much to decrease on front and back. These numbers are changeablle based on the preferred look
let stitch_decrease_front = Math.floor(final_sleeve_width/2);
//To prevent too much tightness on the back, decrease less on the back
let stitch_decrease_back = Math.ceil(final_sleeve_width/3);
//If raglan style is not used, randomize the decrease amount per row to space out the decreases
let random_width = final_sleeve_width/6;

//randomize
let front_decrease = Math.floor(Math.random()*random_width-random_width/2) + stitch_decrease_front;
let back_decrease = Math.floor(Math.random()*random_width-random_width/2) + stitch_decrease_back;
if (raglan_style) {
    front_decrease = stitch_decrease_front;
    back_decrease = stitch_decrease_back;
}
let prev_front = front_decrease;
let prev_back = back_decrease;

//create an array with row by row instructions of number of decreases required per row as well as where the decreases should be placed
let yoke_decrease_rows = [];
let yoke_length = armhole_to_shoulder+shoulder_to_neck;
for (let i = 0; i < yoke_length; i++) {
    if (raglan_style) {
        //don't randomize
        front_decrease = stitch_decrease_front;
        back_decrease = back_decrease;
    } else {
        while (prev_front == front_decrease || prev_back == back_decrease || front_decrease <= 0 || back_decrease <= 0) {
            front_decrease = Math.floor(Math.random()*random_width-random_width/2) + stitch_decrease_front;
            back_decrease = Math.floor(Math.random()*random_width-random_width/2) + stitch_decrease_back;
        }
    }

    let row_decreases = 0;
    if (i < armhole_to_shoulder) {
        row_decreases = base_decreases_1;
        if (shoulder_decrease_rows_1[i] == 'd')
            row_decreases++;
    } else {
        row_decreases = base_decreases_2;
        if (shoulder_decrease_rows_2[i-armhole_to_shoulder] == 'd')
            row_decreases++;
    }
    yoke_decrease_rows.push([row_decreases, front_decrease, back_decrease]);

    if (!raglan_style) {
        prev_front = front_decrease;
        prev_back = back_decrease;
    }

    //curved decreases, to ensure no overlaps higher in the sweater
    if (i % 8 == 0) {
        if (stitch_decrease_front > 8)
            stitch_decrease_front--;
        if (stitch_decrease_back > 8)
            stitch_decrease_back-=2;
        if (random_width > 4) {
            random_width--;
        }
    }
}

let r = 0; //yoke_row to iterate through array that was populated
//keep track of previous decreases to prevent stacking
let prev_front_decreases = [];
let prev_back_decreases = [];

for (let i = 0; i < armhole_to_neckline; i++) {
    
    let front_decrease = yoke_decrease_rows[r][1];
    let back_decrease = yoke_decrease_rows[r][2];

    let br = i + body_tube.length; //bust row tracker incase bust row dart is incomplete
    if (short_rows_1[i]) {
        if (include_bust && br >= bust_start && br < bust_end && bustrows[br-bust_start][0]) {
            let j = br-bust_start;
            let bustdart_left = sh.round2(body_ks.min + bustrows[j][1]*(left_bustpoint-body_ks.min));
            let bustdart_right = sh.round2(body_ks.max - bustrows[j][1]*(body_ks.max-right_bustpoint));
            if (prev_front_decreases.includes(bustdart_left+1)) bustdart_left++;
            if (front_decrease + 1 == bustdart_right) front_decrease--;
            sh.short_row_front(body_ks, body_ks.max, bustdart_left, bustdart_right, body_ks.min);
        } else {
            sh.knit_front(body_ks.max, body_ks.min, body_ks);
        }
        let back_short = back_decrease-2;
        if (prev_back_decreases.includes(back_short + 1)) back_short--;
        sh.short_row_left(body_ks, front_decrease-2, back_short);
        sh.knit_back(body_ks.min, body_ks.max, body_ks);
        body_ks.row++;
        sh.short_row_right(body_ks, front_decrease-2, back_short);
    } else {
        if (include_bust) {
            if (br >= bust_start && br < bust_end && bustrows[br-bust_start][0]) {
                let j = br-bust_start;
                let bustdart_left = sh.round2(body_ks.min + bustrows[j][1]*(left_bustpoint-body_ks.min));
                let bustdart_right = sh.round2(body_ks.max - bustrows[j][1]*(body_ks.max-right_bustpoint));
                if (prev_front_decreases.includes(bustdart_left+1)) bustdart_left++;
                if (front_decrease + 1 == bustdart_right) front_decrease--;
                sh.short_row_front(body_ks, body_ks.max, bustdart_left, bustdart_right, body_ks.min);
            } else {
                sh.knit_front(body_ks.max, body_ks.min, body_ks);
            }
            sh.knit_back(body_ks.min, body_ks.max, body_ks);
            body_ks.row++;
        } else {
            sh.one_tube_row(body_ks);
        }
    }
    prev_front_decreases = [];
    prev_back_decreases = [];
    //perform the decreases
    if (yoke_decrease_rows[r][0] > 0) {
        sh.tube_all_decrease(body_ks, front_decrease, back_decrease);
        prev_front_decreases.push(front_decrease);
        prev_back_decreases.push(back_decrease);
    }
    //if a second set of decreases is required - number of stitches used here is half of the original decrease 
    //but this is just a random choice - it can be changed
    if (yoke_decrease_rows[r][0] > 1) {
        front_decrease = Math.max(1, Math.floor(front_decrease/2));
        back_decrease = Math.max(1, Math.floor(back_decrease/2));
        sh.tube_all_decrease(body_ks, front_decrease, back_decrease);
        prev_front_decreases.push(front_decrease);
        prev_back_decreases.push(back_decrease);
    }
    //increment the yoke row for iteration
    r++;
}

sh.one_tube_row(body_ks);

//----------------
/* NECKLINE */
//----------------

//midL and midR are the needle numbers of the neckline edges
//these are the c-knitting endpoints at the middle of the front of the sweater
let midL = body_ks.min - 5 + ((body_ks.max - body_ks.min + 1)/2) - neckline_base_width/2;
let midR = midL + 8 + neckline_base_width;

//calculate the final midR value required after the decreases will be performed while the neckline is being knit
//This will allows us to calculate the step for the c-knitting endpoints
let temp = [];
for (let i = r; i < yoke_length; i++) {
    temp.push(yoke_decrease_rows[i][0]);
}
let final_midR = body_ks.max - 2*(temp.reduce((a, b) => a + b, 0)) - 4;
let neck_step = 2 * Math.floor(((final_midR - midR))/neck_depth);

//add extra width at the start for any excess neck step that was lost due to flooring on the previous line
let excess_front_neck = final_midR - (midR + (neck_depth/2) * neck_step);
if (excess_front_neck > 2) neck_step += 2;

//iterate through the half the number of neck rows since each iteration will perform 2 rows of knitting
for (let i = 0; i < neck_depth/2; i++) {
    //ensure that the front decrease isn't beyond the neckline point
    let front_decrease = Math.min(yoke_decrease_rows[r][1], Math.floor((body_ks.max - midR)/2) - 2);
    let back_decrease = yoke_decrease_rows[r][2];
    if (short_rows_2[i]) {
        //ensure short rows end before the decrease
        let front_short = front_decrease-4;
        let back_short = back_decrease-4;
        //check that the short row endpoint will not be tucking on the stacked loop of the previous decrease
        if (prev_front_decreases.includes(front_short+1)) front_short--;
        sh.short_row_right(body_ks, front_short, back_short);
    }

    //first part of c-knitting on the frotn right of the sweater
    sh.knit_front(body_ks.max, midR, body_ks);
    console.log(`tuck - f${midR-2} ${body_ks.carrier}`);
    body_ks.row++;


    //do the decreases and increment the decrease counter
    //do this after the first part of the c-knitting as the remainder of the c-knitting will knit over the stacked loops
    //this will mean that all loops can be stacked on for the next set of decreases
    if (yoke_decrease_rows[r][0] > 0) {
        sh.tube_all_decrease(body_ks, front_decrease, back_decrease, true);
    }
    if (yoke_decrease_rows[r][0] > 1){
        sh.tube_all_decrease(body_ks, 1, 1, true);
    }
    r++;
    
    //complete next row of c-knitting in anti-clockwise direction
    sh.knit_front(midR, body_ks.max, body_ks);
    //decrease row counter to align the knitting on the back and front left as two extra rows have now been knitted on the front right
    body_ks.row--;

    assert(midR + neck_step < body_ks.max, "neck step calculation is wrong");
    midR += neck_step;

    //go to left side
    sh.knit_back(body_ks.max, body_ks.min, body_ks);

    front_decrease = Math.min(yoke_decrease_rows[r][1], Math.floor((body_ks.max - midR)/2) - 2);
    back_decrease = yoke_decrease_rows[r][2];
    
    if (short_rows_2[i])
        sh.short_row_left(body_ks, front_decrease-4, back_decrease-4);

    //left side
    sh.knit_front(body_ks.min, midL, body_ks);
    console.log(`tuck + f${midL+2} ${body_ks.carrier}`);
    body_ks.row++;

    //store the decrease points to check when short rowing at the start of the next iteration
    prev_front_decreases = [];
    if (yoke_decrease_rows[r][0] > 0) {
        sh.tube_all_decrease(body_ks, front_decrease, back_decrease, true);
        prev_front_decreases.push(front_decrease);
    }
    if (yoke_decrease_rows[r][0] > 1) {
        sh.tube_all_decrease(body_ks, 1, 1, true);
        prev_front_decreases.push(1);
    }
    r++;
    
    //complete c-knitting
    sh.knit_front(midL, body_ks.min, body_ks);

    //equal no. of rows on back + go to right
    sh.knit_back(body_ks.min, body_ks.max, body_ks);
    body_ks.row++;

    assert(midL - neck_step > body_ks.min, "neck step calculation is wrong!");
    midL -= neck_step;

    //check when to reduce the neck step once all of the excess width as been accounted for
    if (excess_front_neck > 2) {
        excess_front_neck -= 2;
        if (excess_front_neck <= 2) neck_step -= 2;
    }
}

//----------------
/* RIB FINISH + STRETCHY BINDOFF */
//----------------

sh.one_tube_row(body_ks, true);

//change mode to garter on an odd row to add one row of purls before the rib (looks nice)
if (body_ks.row % 2 == 0) {
    body_ks.row++;
}
body_ks.mode = 'g';

sh.one_tube_row(body_ks);

//1x1 neck rib
sh.rib_tube(1, 1, neck_riblen, body_ks);
sh.one_tube_row(body_ks, true);

sh.bindoff_tube(body_ks);

for (let n = body_ks.max+4; n >= body_ks.min-4; n -= 1) {
    console.log(`drop f${n}`);
}
for (let n = body_ks.min-4; n <= body_ks.max+4; n += 1) {
    console.log(`drop b${n}`);
}
