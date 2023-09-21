import assert from 'node:assert/strict';

//object that the minimum and the maximum needle numbers of the tube being knit
export function KnittingState(min, max, row, mode, carrier, carrier2) {
    //edges of tube, min is typically on back bed and max on front bed
    this.min = min;
    this.max = max;

    //row counter used in different stitch patterns etc.
    this.row = row;
    this.carrier = carrier;

    //j for jersey/stockinette
    //g for garter
    //s for seed
    this.mode = mode;

    //for future adaptations with colorwork
    this.carrier2 = 0;
}

//return the carrier to be used based on the row and needle of knitting
export function carr(ks, bed, needle) {
    //we can change this function for different styles/designs/patterns
    return `${ks.carrier}`;
}

//returns the width of the tube in number of needles based on the knitting state
export function get_current_width(ks) {
    return (ks.max - ks.min + 1);
}

//round a number to the nearest even integer
export function round2(n) {
    return 2 * Math.ceil(n/2);
}

/* Given a row instruction, knitting state, and the side of the tube any width changes are on, 
 * this function knits a row of a tube.
 *
 * ks: knitting state
 * row: 'i' for increase along with rows, 'd' for decrease with row and 'n' for normal row
 * side: 'L' for increases/decreases on left side, 'R' for right side, 'A' for both
 * width_change_stitches: how many stitches from the edge to place the increase
 */
export function execute_row(ks, side, row, width_change_stitches) {
    assert(side == 'L' || side == 'R' || side == 'A', "wrong option for tube side");
    assert(row == 'i' || row == 'd' || row == 'n', "wrong row description");

    switch (side) {
        case 'L':
            //only change width on the left side for left tubes
            if (row == 'i') {
                tube_left_increase_row(ks, width_change_stitches)
            }
            else if (row == 'd') {
                tube_left_decrease(ks, width_change_stitches);
                one_tube_loop(ks);
            } else {
                one_tube_loop(ks);
            }
            break;

        case 'R':
            if (row == 'i')
                tube_right_increase_row(ks, width_change_stitches);
            else if (row == 'd')
                tube_right_decrease(ks, width_change_stitches);
            one_tube_loop(ks);
            break;

        case 'A':
            if (row == 'd') {
                tube_all_decrease(ks, 4, 4, false);
                one_tube_loop(ks);
            } else if (row == 'i') {
                tube_all_increase_row(ks, width_change_stitches)
            } else {
                one_tube_loop(ks);
            }
            break;
    }
}

/* This function knits the front of the sweater (even needles)
 * negative direction if start >= end, positive direction otherwise
 * if in garter mode, on even rows knits, on odd rows purls

 * start, end: the leftmost and rightmost needle numbers

 * ks.row: the row number to decide knits/purls for garter/seed stitches
 * ks.mode: stitch pattern type
 * force_jersey: if it is true, knit standard jersey/stockinette
 */
export function knit_front(start, end, ks, force_jersey) {
    
    //find needles to knit on
    function k(n) {
        if (force_jersey || ks.mode == 'j' || (ks.mode == 'g' && ks.row % 2 == 0)) {
            return (n % 2 == 0);
        } else if (ks.mode == 'g') {
            return false;
        } else if (ks.mode == 's') {
            if (ks.row % 2 == 0) return n % 4 == 0;
            else return (n + 2) % 4 == 0;
        }
    }

    //find needles to purl on
    function p(n) {
        if (force_jersey || ks.mode == 'j' || (ks.mode == 'g' && ks.row % 2 == 0)) {
            return false;
        } else if (ks.mode == 'g') {
            return (n % 2 == 0);
        } else if (ks.mode == 's') {
            if (ks.row % 2 == 0) return (n + 2) % 4 == 0;
            else return n % 4 == 0;
        }
    }

    if (start >= end) {
        for (let n = end; n <= start; n += 1) {
            if (p(n))
                console.log(`xfer f${n} b${n}`);
        }
        for (let n = start; n >= end; n -= 1) {
            if (k(n))
                console.log(`knit - f${n} ${carr(ks, `f`,  n)}`);
            if (p(n))
                console.log(`knit - b${n} ${carr(ks, `b`,  n)}`);
        }
        if (ks.mode != 'j') console.log(`miss - b${end} ${carr(ks, `b`,  end)}`);
        for (let n = end; n <= start; n += 1) {
            if (p(n))
                console.log(`xfer b${n} f${n}`);
        }
    } else {
        for (let n = end; n >= start; n -= 1) {
            if (p(n))
                console.log(`xfer f${n} b${n}`);
        }
        for (let n = start; n <= end; n += 1) {
            if (k(n))
                console.log(`knit + f${n} ${carr(ks, `f`,  n)}`);
            if (p(n))
                console.log(`knit + b${n} ${carr(ks, `b`,  n)}`);
        }
        if (ks.mode != 'j') console.log(`miss + b${end} ${carr(ks, `b`,  end)}`);
        for (let n = end; n >= start; n -= 1) {
            if (p(n))
                console.log(`xfer b${n} f${n}`);
        }
    }
}

/* This function knits the back of the sweater (odd needles)
 * positive direction if start <= end, negative direction otherwise
 * if in garter mode, on even rows knits, on odd rows purls

 * start, end: the leftmost and rightmost needle numbers

 * ks.row: the row number to decide knits/purls for garter/seed stitches
 *         if it is negative, knit standard jersey/stockinette
 * ks.mode: stitch pattern type
 * force_jersey: if it is true, knit standard jersey/stockinette
 */
export function knit_back(start, end, ks, force_jersey) {

    //find needles to knit on
    function k(n) {
        if (force_jersey || ks.mode == 'j' || (ks.mode == 'g' && ks.row % 2 == 0)) {
            return (n % 2 != 0);
        } else if (ks.mode == 'g') {
            return false;
        } else if (ks.mode == 's') {
            if (ks.row % 2 == 0) return (n - 1) % 4 == 0;
            else return (n + 1) % 4 == 0;
        }
    }

    //find needles to purl on
    function p(n) {
        if (force_jersey || ks.mode == 'j' || (ks.mode == 'g' && ks.row % 2 == 0)) {
            return false;
        } else if (ks.mode == 'g') {
            return (n % 2 != 0);
        } else if (ks.mode == 's') {
            if (ks.row % 2 == 0) return (n + 1) % 4 == 0;
            else return (n - 1) % 4 == 0;
        }
    }

    if (start <= end) {
        for (let n = end; n >= start; n -= 1) {
            if (p(n))
                console.log(`xfer b${n} f${n}`);
        }
        for (let n = start; n <= end; n += 1) {
            if (k(n))
                console.log(`knit + b${n} ${carr(ks, `b`,  n)}`);
            if (p(n))
                console.log(`knit + f${n} ${carr(ks, `f`,  n)}`);
        }
        if (ks.mode != 'j') console.log(`miss + f${end} ${carr(ks, `f`,  end)}`);
        for (let n = end; n >= start; n -= 1) {
            if (p(n))
                console.log(`xfer f${n} b${n}`);
        }
    } else {
        for (let n = end; n <= start; n += 1) {
            if (p(n))
                console.log(`xfer b${n} f${n}`);
        }
        for (let n = start; n >= end; n -= 1) {
            if (p(n))
                console.log(`knit - f${n} ${carr(ks, `f`,  n)}`);
            if (k(n))
                console.log(`knit - b${n} ${carr(ks, `b`,  n)}`);
        }
        if (ks.mode != 'j') console.log(`miss - f${end} ${carr(ks, `f`,  end)}`);
        for (let n = end; n <= start; n += 1) {
            if (p(n))
                console.log(`xfer f${n} b${n}`);
        }
    }
}

/* This function knits one loop of a tube, starts at ks.max and 
   knits clockwise

 * ks.min, ks.max: the leftmost and rightmost needle numbers
 */
export function one_tube_loop(ks, force_jersey) {
    knit_front(ks.max, ks.min, ks, force_jersey);
    knit_back(ks.min, ks.max, ks, force_jersey);
    ks.row++;
    //console.log(`; ${ks.row}`);
}

/* This function knits a tube
   
 * length: number of rows to knit
 * ks.min, ks.max: the leftmost and rightmost needle numbers
 */
export function tube(length, ks) {
    for (let i = 0; i < length; i++) {
        one_tube_loop(ks);
    }
}

/* This function knits an m x n rib on a tube

 * length: number of rows to knit
 * ks.min, ks.max: the leftmost and rightmost needle numbers
 * decrease_stitches - add decreases on every row of this many stitches
 */
export function rib_tube(m, n, length, ks, decrease_stitches) {
    if (length <= 0) return;
    let set = (m + n) * 2;
    let switch_point = m * 2;

    let max = ks.max;
    let min = ks.min;

    function k(bed, ned) {
        if (bed == 'f' && ned % 2 == 0 && ((max - ned) % set < switch_point)) return true;
        if (bed == 'b' && ned % 2 != 0 && ((max - min + 1 + (ned - min)) % set < switch_point)) return true;
        return false;
    }

    function p(bed, ned) {
        if (bed == 'f' && ned % 2 == 0 && !k(bed, ned)) return true;
        if (bed == 'b' && ned % 2 != 0 && !k(bed, ned)) return true;
        return false;
    }

    for (let i = 0; i < length; i++) {

        //if decreases are to be added in the rib - not being used right now
        if (decrease_stitches > 0) {
            tube_all_decrease(ks, decrease_stitches, decrease_stitches);
        }

        for (let j = ks.min; j <= ks.max; j += 1) {
            if (p('f', j))
                console.log(`xfer f${j} b${j}`);
        }

        //left pass
        for (let j = ks.max; j >= ks.min; j -= 1) {
            if (k('f', j))
                console.log(`knit - f${j} ${carr(ks, `f`,  j)}`);
            else if (p('f', j))
                console.log(`knit - b${j} ${carr(ks, `b`,  j)}`);
        }
        console.log(`miss - b${ks.min} ${carr(ks, `b`,  ks.min)}`);
        
        
        for (let j = ks.max; j >= ks.min; j -= 1) {
            //restore needles that were xferred earlier
            if (p('f', j) || p('b', j))
                console.log(`xfer b${j} f${j}`);
        }
        
        //right pass
        for (let j = ks.min; j <= ks.max; j += 1) {
            if (k('b', j))
                console.log(`knit + b${j} ${carr(ks, `b`,  j)}`);
            else if (p('b', j))
                console.log(`knit + f${j} ${carr(ks, `f`,  j)}`);
        }
        console.log(`miss + f${ks.max} ${carr(ks, `f`,  ks.max)}`);
        
        for (let j = ks.min; j <= ks.max; j += 1) {
            //xfer needles for rib on front
            if (p('b', j))
                console.log(`xfer f${j} b${j}`);
        }
    }
}

/* Performs an inhook.
 * Then casts on in a zigzag style - tuck on both front and back beds for alternate needle
 * numbers. Then knit a loop around all the tucks and xfer them onto the front row
 * if needle numbers were even and back row otherwise
   
 * ks.min, ks.max: the leftmost and rightmost needle numbers
 */
export function zigzag_cast_on(ks) {
    
    console.log(`inhook ${ks.carrier}`);

    //front bed needles (even)
    console.log(`tuck - f${ks.max+1} ${ks.carrier}`);
    console.log(`rack -0.75`);
    for (let i = ks.max; i >= ks.min; i -= 1) {
        if (i % 2 == 0) {
            console.log(`tuck - f${i} ${ks.carrier}`);
            console.log(`tuck - b${i} ${ks.carrier}`);
        }
    }
    console.log(`drop f${ks.max+1}`);
    for (let i = ks.min; i <= ks.max; i += 1) {
        if (i % 2 == 0)
            console.log(`knit + f${i} ${ks.carrier}`);
    }
    for (let i = ks.max; i >= ks.min; i -= 1) {
        if (i % 2 == 0) {
            console.log(`knit - b${i} ${ks.carrier}`);
        }
    }

    console.log(`miss - b${ks.min} ${ks.carrier}`);
    
    console.log(`rack 0`);
    console.log(`releasehook ${ks.carrier}`);

    for (let i = ks.min; i <= ks.max; i += 1) {
        if (i % 2 == 0)
            console.log(`xfer b${i} f${i}`);
    }
    
    //back bed needles (odd)
    console.log(`rack -0.75`);
    for (let i = ks.min; i <= ks.max; i += 1) {
        if (i % 2 != 0) {
            console.log(`tuck + b${i} ${ks.carrier}`);
            console.log(`tuck + f${i} ${ks.carrier}`);
        }
    }
    for (let i = ks.max; i >= ks.min; i -= 1) {
        if (i % 2 != 0)
            console.log(`knit - b${i} ${ks.carrier}`);
    }
    for (let i = ks.min; i <= ks.max; i += 1) {
        if (i % 2 != 0) {
            console.log(`knit + f${i} ${ks.carrier}`);
        }
    }
    console.log(`rack 0`);
    for (let i = ks.max; i >= ks.min; i -= 1) {
        if (i % 2 == 1 || i % 2 == -1)
            console.log(`xfer f${i} b${i}`);
    }
    
    one_tube_loop(ks, true);
}

//does a cast on then rib in standard stitch settings
export function cast_on_and_rib(ks, rib_m, rib_n, riblen) {
    console.log(`x-stitch-number 102`); //22-10, tighter stitch size for casting on
    zigzag_cast_on(ks);
    console.log(`x-stitch-number 101`); //40-25, normal stitch size
    one_tube_loop(ks, true);
    rib_tube(rib_m, rib_n, riblen, ks);
    one_tube_loop(ks, true);
}

/* binds off the front bed of the tube

 * ks.min, ks.max: the leftmost and rightmost needle numbers
 * slack: how far away to tuck on the opposite bed for a loose bindoff (<3 recommended)
 */
export function bindoff_front(ks, slack) {
    for (let i = ks.max; i > ks.min+1; i -= 1) {
        if (i % 2 == 0) {
            console.log(`x-stitch-number 5`); //30-25, tighter stitch for small tuck
            console.log(`tuck + b${i + 2*slack} ${carr(ks, `b`,  i + 2*slack)}`);
            console.log(`x-stitch-number 103`); //40-25
            console.log(`rack +2`);
            console.log(`xfer f${i} b${i-2}`);
            console.log(`rack 0`);
            console.log(`xfer b${i-2} f${i-2}`);
            console.log(`knit - f${i-2} ${carr(ks, `f`,  i-2)}`);
        }
    }
}

/* binds off the back bed of the tube

 * ks.min, ks.max: the leftmost and rightmost needle numbers

 * slack: how far away to tuck on the opposite bed for a loose bindoff (<3 recommended)
 */
export function bindoff_back(ks, slack) {
    for (let i = ks.min; i < ks.max-1; i += 1) {
        if (i % 2 != 0) {
            console.log(`x-stitch-number 5`); //30-25, tighter stitch for small tuck
            console.log(`tuck - f${i - 2*slack} ${carr(ks, `f`,  i-2*slack)}`);
            console.log(`x-stitch-number 103`); //40-25
            console.log(`rack +2`);
            console.log(`xfer b${i} f${i+2}`);
            console.log(`rack 0`);
            console.log(`xfer f${i+2} b${i+2}`);
            console.log(`knit + b${i+2} ${carr(ks, `b`,  i + 2)}`);
        }   
    }
}

/* knits a tag on the last loop after the bindoff

 * last: the needle to start the tag on
 * carrier: the yarn carrier to use
 */
function tag(last, carrier) {
    console.log(`knit + f${last} ${carrier}`);
    console.log(`knit - f${last+2} ${carrier}`);
    console.log(`knit - f${last} ${carrier}`);
    console.log(`knit + f${last} ${carrier}`);
    console.log(`knit + f${last+2} ${carrier}`);
    for(let i = 0; i < 6; i++) {
        console.log(`knit - f${last+4} ${carrier}`);
        console.log(`knit - f${last+2} ${carrier}`);
        console.log(`knit - f${last} ${carrier}`);
        console.log(`knit + f${last} ${carrier}`);
        console.log(`knit + f${last+2} ${carrier}`);
        console.log(`knit + f${last+4} ${carrier}`);
    }

    console.log(`drop f${last}`);
    console.log(`drop f${last+2}`);
    console.log(`drop f${last+4}`);

    //get the yarn out:
    console.log(`outhook ${carrier}`);
}

/* This function performs a stretchy bind off on a tube, with tucks made on opposite bed
 * before xfers for every loop and dropped after knitting through them for stretchiness. 
 * After the bindoff, a tag is knit.
   
 * ks.min, ks.max: the leftmost and rightmost needle numbers
 */
export function bindoff_tube(ks) {

    bindoff_front(ks, 0);

    console.log(`rack +1`);
    console.log(`xfer f${ks.min+1} b${ks.min}`);
    console.log(`rack 0`);
    console.log(`knit + b${ks.min} ${carr(ks, `b`,  ks.min)}`);

    bindoff_back(ks, 0);

    //tag
    console.log(`xfer b${ks.max-1} f${ks.max-1}`);
    tag(ks.max-1, carr(ks, `f`,  ks.max-1));

    for (let i = ks.max; i >= ks.min; i--) {
        console.log(`drop f${i}`);
    }
    for (let i = ks.min; i <= ks.max; i++) {
        console.log(`drop b${i}`);
    }
}

//------INCREASE/DECREASE FUNCTIONS-------------

/* knits a rows and performs an increase on the left of the tube
 * Assumes the carrier is at ks.max
 * reduces ks.min by 2
 *
 * ks: the knitting state
 * stitches: how many internal stitches to increase

 */
export function tube_left_increase_row(ks, stitches) {
    let front_gap = stitches*2 + 1;
    let back_gap = stitches*2;

    //knit regularly to the point of the back bed increase, adding stitches at the increase points
    knit_front(ks.max, ks.min+front_gap+2, ks);
    console.log(`split + f${ks.min+front_gap} b${ks.min+front_gap} ${carr(ks, 'f', ks.min+front_gap)}`);
    knit_front(ks.min+front_gap - 2, ks.min, ks);

    knit_back(ks.min, ks.min+back_gap-2, ks);
    console.log(`split - b${ks.min+back_gap} f${ks.min+back_gap} ${carr(ks, 'b', ks.min+back_gap)}`);
    //move carrier out of the way
    console.log(`miss - b${ks.min-5} ${carr(ks, 'b', ks.min-5)}`);

    //move the loops to the left and make space for the loops added from the splits
    for (let i = ks.min + back_gap - 2; i >= ks.min; i-= 2) {
        console.log(`xfer b${i} f${i}`);
    }
    console.log(`rack +2`);
    for (let i = ks.min + back_gap; i >= ks.min; i-= 2) {
        console.log(`xfer f${i} b${i-2}`);
    }
    for (let i = ks.min + front_gap; i >= ks.min + 1; i-= 2) {
        console.log(`xfer f${i} b${i-2}`);
    }
    console.log(`rack 0`);
    for (let i = ks.min + front_gap; i >= ks.min + 1; i-= 2) {
        console.log(`xfer b${i-2} f${i-2}`);
    }
    console.log(`xfer b${ks.min+front_gap} f${ks.min+front_gap}`);
    console.log(`xfer f${ks.min+back_gap} b${ks.min+back_gap}`);

    //continue knitting normally
    knit_back(ks.min + back_gap + 2, ks.max, ks);

    //update the minimum bound of the knitting state
    ks.min-=2;

    //increment row counter
    ks.row++;
}

/* knits a rows and performs an increase on the right of the tube
 * Assumes the carrier is at ks.max
 * increases ks.max by 2
 *
 * ks: the knitting state
 * stitches: how many internal stitches to increase
 */
export function tube_right_increase_row(ks, stitches) {
    let front_gap = stitches*2;
    let back_gap = stitches*2 + 1;

    //similar to tube_left_increase row, with the gaps calculated slightly differently.
    knit_front(ks.max, ks.max-front_gap+2, ks);
    console.log(`split + f${ks.max-front_gap} b${ks.max-front_gap} ${carr(ks, `f`,  ks.max-front_gap)}`);
    knit_front(ks.max-front_gap-2, ks.min, ks);
    knit_back(ks.min, ks.max - back_gap - 2, ks);
    console.log(`split - b${ks.max-back_gap} f${ks.max-back_gap} ${carr(ks, `b`,  ks.max-back_gap)}`);
    console.log(`miss - b${ks.max-back_gap-2} ${carr(ks, `b`,  ks.max-back_gap-2)}`);

    for (let i = ks.max - front_gap + 2; i <= ks.max; i += 2) {
        console.log(`xfer f${i} b${i}`);
    }
    console.log(`rack +2`);
    for (let i = ks.max - front_gap; i <= ks.max; i += 2) {
        console.log(`xfer b${i} f${i+2}`);
    }
    for (let i = ks.max - back_gap; i <= ks.max - 1; i += 2) {
        console.log(`xfer b${i} f${i+2}`);
    }
    console.log(`rack 0`);
    for (let i = ks.max - back_gap; i <= ks.max - 1; i+= 2) {
        console.log(`xfer f${i+2} b${i+2}`);
    }
    //xfer the splits to the opposite bed
    console.log(`xfer b${ks.max - front_gap} f${ks.max - front_gap}`);
    console.log(`xfer f${ks.max - back_gap} b${ks.max - back_gap}`);
    
    //update the max bound of the knitting state
    ks.max+=2;

    //finish the row
    knit_back(ks.max - back_gap + 2, ks.max, ks);
    
    //increment row counter
    ks.row++;
}

/* knits a rows and performs an increase on both sides the tube
 * Assumes the carrier is at ks.max
 * increases ks.max by 2 and decreases ks.min by 2
 *
 * ks: the knitting state
 * stitches: how many internal stitches to increase
 */
export function tube_all_increase_row(ks, stitches) {

    //combination of tube_left_increase_row and tube_right_increase_row

    let even_gap = stitches*2;
    let odd_gap = stitches*2 + 1;

    knit_front(ks.max, ks.max-even_gap+2, ks);
    console.log(`split + f${ks.max-even_gap} b${ks.max-even_gap} ${carr(ks, `f`,  ks.max-even_gap)}`);
    
    knit_front(ks.max-even_gap-2, ks.min+odd_gap+2, ks);
    console.log(`split + f${ks.min+odd_gap} b${ks.min+odd_gap} ${carr(ks, 'f', ks.min+odd_gap)}`);
    knit_front(ks.min+odd_gap - 2, ks.min, ks);

    knit_back(ks.min, ks.min+even_gap-2, ks);
    console.log(`split - b${ks.min+even_gap} f${ks.min+even_gap} ${carr(ks, 'b', ks.min+even_gap)}`);
    console.log(`miss + b${ks.min-4} ${carr(ks, 'b', ks.min-4)}`);

    for (let i = ks.min + even_gap - 2; i >= ks.min; i-= 2) {
        console.log(`xfer b${i} f${i}`);
    }
    console.log(`rack +2`);
    for (let i = ks.min + even_gap; i >= ks.min; i-= 2) {
        console.log(`xfer f${i} b${i-2}`);
    }
    for (let i = ks.min + odd_gap; i >= ks.min + 1; i-= 2) {
        console.log(`xfer f${i} b${i-2}`);
    }
    console.log(`rack 0`);
    for (let i = ks.min + odd_gap; i >= ks.min + 1; i-= 2) {
        console.log(`xfer b${i-2} f${i-2}`);
    }
    console.log(`xfer b${ks.min+odd_gap} f${ks.min+odd_gap}`);
    console.log(`xfer f${ks.min+even_gap} b${ks.min+even_gap}`);

    //note: the xfers are done separately to prevent loop entanglement across the splits on the back bed

    knit_back(ks.min + even_gap + 2, ks.max - odd_gap - 2, ks);
    ks.min-=2;


    console.log(`split - b${ks.max-odd_gap} f${ks.max-odd_gap} ${carr(ks, `b`,  ks.max-odd_gap)}`);
    console.log(`miss - b${ks.max-odd_gap-2} ${carr(ks, `b`,  ks.max-odd_gap-2)}`);

    for (let i = ks.max - even_gap + 2; i <= ks.max; i += 2) {
        console.log(`xfer f${i} b${i}`);
    }
    console.log(`rack +2`);
    for (let i = ks.max - even_gap; i <= ks.max; i += 2) {
        console.log(`xfer b${i} f${i+2}`);
    }
    for (let i = ks.max - odd_gap; i <= ks.max - 1; i += 2) {
        console.log(`xfer b${i} f${i+2}`);
    }
    console.log(`rack 0`);
    for (let i = ks.max - odd_gap; i <= ks.max - 1; i+= 2) {
        console.log(`xfer f${i+2} b${i+2}`);
    }

    console.log(`xfer b${ks.max - even_gap} f${ks.max - even_gap}`);
    console.log(`xfer f${ks.max - odd_gap} b${ks.max - odd_gap}`);
    
    ks.max+=2;
    knit_back(ks.max - odd_gap + 2, ks.max, ks);
    
    ks.row++;
}


/* Performs an decrease on the left of the tube
 * increases ks.min by 2
 * No knitting is done.
 *
 * ks: the knitting state
 * stitches: how many internal stitches to decrease
 */
export function tube_left_decrease(ks, stitches) {

    let needles = stitches * 2 - 1;
    if (needles > ks.max - ks.min) console.error("decrease bigger than tube");

    //back bed
    for (let j = ks.min; j <= ks.min + needles; j += 2) {
        console.log(`xfer b${j} f${j}`);
    }
    console.log(`rack -2`);
    for (let j = ks.min; j <= ks.min + needles; j += 2) {
        console.log(`xfer f${j} b${j+2}`);
    }
    ks.min++;
    //front bed
    for (let j = ks.min; j <= ks.min + needles; j += 2) {
        console.log(`xfer f${j} b${j+2}`);
    }
    console.log(`rack 0`);
    for (let j = ks.min; j <= ks.min + needles; j += 2) {
        console.log(`xfer b${j+2} f${j+2}`);
    }
    ks.min++;
}

/* Performs an decrease on the right of the tube
 * reduces ks.max by 2
 * No knitting is done.
 *
 * ks: the knitting state
 * stitches: how many internal stitches to decrease
 */
export function tube_right_decrease(ks, stitches) {

    let needles = stitches * 2 - 1;
    if (needles > ks.max - ks.min) console.error("decrease bigger than tube");

    //front bed
    for (let j = ks.max; j >= ks.max - needles; j -= 2) {
        console.log(`xfer f${j} b${j}`);
    }
    console.log(`rack -2`);
    for (let j = ks.max; j >= ks.max - needles; j -= 2) {
        console.log(`xfer b${j} f${j-2}`);
    }
    ks.max--;
    //back bed
    for (let j = ks.max; j >= ks.max - needles; j -= 2) {
        console.log(`xfer b${j} f${j-2}`);
    }
    console.log(`rack 0`);
    for (let j = ks.max; j >= ks.max - needles; j -= 2) {
        console.log(`xfer f${j-2} b${j-2}`);
    }
    ks.max--;;
}

/* This function narrows a tube by performing internal decreases on all corners. 
 * No knitting is done.
   
 * ks.min, ks.max: the leftmost and rightmost needle numbers
 * left_stitches, right_stitches: the number of stitches wide the xfers should be
 * ks.carrier: the yarn carrier in use (typically at ks.max), to miss away from the knitting to prevent extra passes
 * maintain_carrier: set to true if the miss is not wanted
 */
export function tube_all_decrease(ks, front_stitches, back_stitches, maintain_carrier) {

    //add a miss unless told not to do so. Typically maintain_carrier = true when the carrier is not at ks.max
    if (!maintain_carrier)
        console.log(`miss + b${ks.max+1} ${carr(ks, `b`,  ks.max)}`);

    let front_needles = front_stitches * 2 - 1;
    let back_needles = back_stitches * 2 - 1;

    if (front_needles > ks.max - ks.min) console.error("decrease bigger than tube");
    if (back_needles > ks.max - ks.min) console.error("decrease bigger than tube");
    if (ks.min + 2 * front_needles >= ks.max || ks.min + 2 * back_needles >= ks.max) {
        console.error("decreases overlap");
    }
    
    for (let j = ks.max; j >= ks.max - front_needles; j -= 1) {
        //decrease on front right part 1
        if (j % 2 == 0)
            console.log(`xfer f${j} b${j}`);
    }
    for (let j = ks.min + back_needles; j >= ks.min; j -= 1) {
        //decrease on back left part 1
        if (j % 2 != 0) {
            console.log(`xfer b${j} f${j}`);
        }
            
    }
    console.log(`rack -2`);
    for (let j = ks.min; j <= ks.min + back_needles; j += 1) {
        //decrease on back left part 2
        if (j % 2 != 0)
            console.log(`xfer f${j} b${j+2}`);
    }
    for (let j = ks.max - front_needles; j <= ks.max; j += 1) {
        //decrease on front right part 2
        if (j % 2 == 0)
            console.log(`xfer b${j} f${j-2}`);
    }
    ks.max -= 1;
    ks.min += 1;

    for (let j = ks.max; j >= ks.max - back_needles; j -= 1) {
        //decrease on back right part 1
        if (j % 2 != 0)
            console.log(`xfer b${j} f${j-2}`);
    }
    for (let j = ks.min + front_needles; j >= ks.min; j -= 1) {
        //decrease on front left part 1
        if (j % 2 == 0)
            console.log(`xfer f${j} b${j+2}`);
    }
    console.log(`rack 0`);
    for (let j = ks.min; j <= ks.min + front_needles; j += 1) {
        //decrease on front left part 2
        if (j % 2 == 0)
            console.log(`xfer b${j+2} f${j+2}`);
    }
    for (let j = ks.max - back_needles; j <= ks.max; j += 1) {
        //decrease on back right part 2
        if (j % 2 != 0)
            console.log(`xfer f${j-2} b${j-2}`);
    }
    console.log(`rack 0`);
    ks.min += 1;
    ks.max -= 1;
}

/* This function builds an array with roughly evenly spaced out instructions
 * This can be used when building with changing tubes/short row patterns etc
 *
 * rows: Total length of array
 * instructions: How many "instructions" to be spaced out in the array
 * value: what to store at index with an "instruction"
 * default_val: what to store at other indices
 */
export function array_with_spaced_instructions(rows, instructions, value, default_val) {
    assert(value != default_val);
    assert(instructions <= rows);
    assert(rows > 0 && instructions >= 0);
    let array = [];

    //if no instructions, just fill an array with the default value and return
    if (instructions == 0) {
        for (let i = 0; i < rows; i++)
            array.push(default_val);
        return array;
    }

    //calculate how to space out the instructions
    let rows_per_instruction = Math.floor(rows/instructions);
    let excess_rows = rows - rows_per_instruction * instructions;
    let instructions_per_excess = Math.floor(instructions/excess_rows);
    for (let i = 0; i < instructions; i++) {
        if (i % instructions_per_excess == 0 && excess_rows > 0) {
            array.push(default_val);
            excess_rows--;
        }
        array.push(value);
        for (let j = 0; j < rows_per_instruction-1; j++) {
            array.push(default_val);
        }
    }

    return array;
}

/* Calculates when to perform width changes on a tube given the number of changes and length of the tube
 * Returns an array with elements 'n' for no change or instruction if there is to be a width change
 * for every row corresponding to the array element/

 * all_side: true if the changes are to be made on both sides of the tube
 * changes: number of changes to be made throughout the tube
 * instruction: typically 'i' for increase, 'd' for decrease
 * length: total length of the tube
 */
export function width_changing_tube(both_sides, changes, instruction, length) {

    //one width change uses 2 more needles on right/left side and 4 if both sides are used
    changes /= 2;
    if (both_sides) changes /= 2;

    changes = Math.floor(changes);

    if (length >= changes) {

        //array to store row by row instructions
        return array_with_spaced_instructions(length, changes, instruction, 'n');

    } else {
        console.error("changes too steep, not yet implemented");
    }
}

/* given a set of measuements along a tube, return an array of "width changing tubes"
 * 
 * current_width: width of the tube in number of needles
 * measurements: 2D array of form [[width_0, length_0],...,[width_n, length_n]] 
 * all_side: true if the changes are to be made on both sides of the tube
 */
export function width_changing_segments(current_width, all_side, measurements) {

    let segments = [];
    let width1 = current_width;
    
    //for all the measurements, calculate the width changing tubes and add it to the array
    for (let i = 0; i < measurements.length; i++) {
        let width2 = measurements[i][0];
        let length = measurements[i][1];
        if (width1 < width2) {
            segments = segments.concat(width_changing_tube(all_side, width2-width1, 'i', length));
        } else if (width1 > width2) {
            segments = segments.concat(width_changing_tube(all_side, width1-width2, 'd', length));
        } else {
            let rows = [];
            for (let i = 0; i < length; i++) {
                rows.push('n');
            }
            segments = segments.concat(rows);
        }
        width1 = width2;
    }
    return segments;
}

/* Knit a short row (back and forth) on the left edge of a tube
 * Intended for use at shoulder join
 *
 * ks: knitting state
 * front_stitches: length of short row on front bed
 * back_stitches: length of short row on back bed
 */
export function short_row_left(ks, front_stitches, back_stitches) {

    let back_tuckpoint = round2(ks.min + (back_stitches)*2)-1;
    let front_tuckpoint = round2(ks.min + (front_stitches)*2);

    if (back_stitches > 1) {
        knit_back(ks.min, back_tuckpoint - 2, ks);
        console.log(`tuck + b${back_tuckpoint} ${ks.carrier}`);
        ks.row++;

        knit_back(back_tuckpoint - 2, ks.min, ks);
        ks.row--;
    }
    if (front_stitches > 1) {
        ks.row++;
        knit_front(ks.min, front_tuckpoint - 2, ks);
        console.log(`tuck + f${front_tuckpoint} ${ks.carrier}`);
    
        ks.row--;
        knit_front(front_tuckpoint - 2, ks.min, ks);
    }
}

/* Knit a short row (back and forth) on the right edge of a tube
 * Intended for use at shoulder join
 *
 * ks: knitting state
 * front_stitches: length of short row on front bed
 * back_stitches: length of short row on back bed
 */
export function short_row_right(ks, front_stitches, back_stitches) {

    let back_tuckpoint = round2(ks.max - (back_stitches)*2) + 1;
    let front_tuckpoint = round2(ks.max - (front_stitches)*2);

    if (front_stitches > 1) {
        knit_front(ks.max, front_tuckpoint + 2, ks);
        console.log(`tuck - f${front_tuckpoint} ${ks.carrier}`);
        ks.row++;

        knit_front(front_tuckpoint + 2, ks.max, ks);
        ks.row--;
    }

    if (back_stitches > 1) {
        knit_back(ks.max, back_tuckpoint + 2, ks);
        console.log(`tuck - b${back_tuckpoint} ${ks.carrier}`);
        ks.row++;

        knit_back(back_tuckpoint + 2, ks.max, ks);
        ks.row--;
    }
}

/* Create an array of instructions for a horizontal bust dart
 * Each index represents a row on the body and indicates whether
 * a short row is to be knit at that row and the endpoints
 * for the short row. The endpoints are made in a hexagonal shape,
 * starting and ending in line with the left and right bust points 
 * and widening by bust radius in the between rows.
 * 
 * ks: knitting state
 * bustlen: number of rows (along the side or back) where the bust region is
 * front_back_bust_diff: Number of extra rows needed on the front as short rows
 * seperation: distance between bust points
 * bust_radius: how much the bust dart widens
 */
export function horizontal_bust_dart(bustlen, front_back_bust_diff) {

    if (front_back_bust_diff/2 > bustlen) {
        console.error("More than 200% extra rows for bust, rounding down.");
        front_back_bust_diff = bustlen;
    }

    //find where to add the short rows for the bust dart
    let bustrows = array_with_spaced_instructions(bustlen, front_back_bust_diff/2, true, false);

    //build the bust, using a shape resembling a rectangle 
    //with 2 triangles with bases on the left and right 
    //edges of the rectangle removed
    let endpoints1 = [];
    let endpoints2 = [];
    let prev = 0;
    let change = 1/(bustlen/2);
    for (let i = 0; i < bustlen/2; i++) {
        endpoints1.push(prev);
        endpoints2.push(prev);
        prev += change;
    }
    let endpoints = endpoints1.concat(endpoints2.reverse());

    for (let i = 0; i < bustlen; i++) {
        bustrows[i] = [bustrows[i], endpoints[i]];
    }

    return bustrows;
    
}

/* Knit a short row (back and forth) on the front bed
 * Intended for use at bust
 * knits from start to left turn, then to right turn, then to end
 *
 * ks: knitting state
 * start: where to start knitting from
 * end: where to finish knitting
 */
export function short_row_front(ks, start, left_turn, right_turn, end) {
    //ensure that the short endpoitns are on even needles because it is on the front bed
    round2(left_turn);
    round2(right_turn);

    knit_front(start, left_turn + 2, ks);
    console.log(`tuck - f${left_turn} ${ks.carrier}`);
    ks.row++;

    knit_front(left_turn + 2, right_turn - 2, ks);
    console.log(`tuck + f${right_turn} ${ks.carrier}`);
    ks.row++;
    
    knit_front(right_turn - 2, end, ks);
}
