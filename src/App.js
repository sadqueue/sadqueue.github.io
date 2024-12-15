import "./App.css";
import React, { useState, useEffect } from "react";
import moment from "moment";
import {
    SHIFT_TYPES,
    START_TIMES,
    FOURPM_DATA,
    FIVEPM_DATA,
    SEVENPM_DATA,
    SCORE_NEW_ROLE,
    CUSTOM_DATA,
    DATA_TYPE_INT,
    DATA_TYPE_TIME,
    CHRONIC_LOAD_RATIO_THRESHOLD,
    ADMISSIONS_FORMAT,
    TIME_FORMAT,
    MINIMIZE_TABLE,
    EXPAND_TABLE
} from "./constants";
import copybutton from "./images/copy.png";
import githublogo from "./images/github-mark.png"
import emailjs from "@emailjs/browser";
import CONFIG1 from "./config";
const CONFIG = CONFIG1;

export function App() {
    const localData = localStorage.getItem("admissionsData");

    const [admissionsData, setAdmissionsData] = useState(localData ? JSON.parse(localData) : FOURPM_DATA)
    const [sorted, setSorted] = useState("");
    const [seeDetails, setSeeDetails] = useState(false);
    const [explanation, setExplanation] = useState("");
    const [openTable, setOpenTable] = useState(false);
    const [weight, setWeight] = useState(0.3);
    const [sortedTableToDisplay, setSortedTableToDisplay] = useState(admissionsData && admissionsData.shifts ? admissionsData.shifts : []);
    const [selectCustom, setSelectCustom] = useState(false);
    const [sortConfig, setSortConfig] = useState(
        {
            "name": true,
            "numberOfAdmissions": true,
            "timestamp": true,
            "chronicLoadRatio": true,
            "numberOfHours": true,
            "score": true
        }
    );

useEffect(() => {
    emailjs.init(CONFIG.REACT_APP_EMAILJS_PUBLIC_KEY);
    if (localStorage.getItem("admissionsData")) {
        const admissionsDataLocalStorage = JSON.parse(localStorage.getItem("admissionsData"));
        setAdmissionsData(admissionsDataLocalStorage);
    }

    sortMain(admissionsData);

    handleSort("name");


    /*const firebaseConfig = {
        apiKey: CONFIG.REACT_APP_FIREBASE_API_KEY,
        authDomain: CONFIG.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: CONFIG.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: CONFIG.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: CONFIG.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: CONFIG.REACT_APP_FIREBASE_APP_ID,
        measurementId: CONFIG.REACT_APP_FIREBASE_MEASUREMENT_ID

    };
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();*/
}, []);

const sortMain = (timeObj) => {
    // return sortByCompositeScore(timeObj);
    return sortByTimestampAndCompositeScore(timeObj);

}

const sortByTimestampAndCompositeScore = (timeObj) => {
    timeObj && timeObj.shifts && timeObj.shifts.map((each, eachIndex) => {
        each["startTime"] = timeObj.startTime;
        each["minutesWorkedFromStartTime"] = getMinutesWorkedFromStartTime(each);
        each["numberOfHoursWorked"] = getNumberOfHoursWorked(each);
        each["chronicLoadRatio"] = getChronicLoadRatio(each);
        each["score"] = getCompositeScore(each);
        each["numberOfAdmissions"] = each.numberOfAdmissions ? each.numberOfAdmissions : "";
        return true;
    });

    const explanationArr = [];
    explanationArr.push("\n");
    explanationArr.push("Step 1: Sort based on timestamp");

    /*
    Step 1: Step 1: Sort based on timestamp 
    */
    timeObj && timeObj.shifts && timeObj.shifts.sort(function (a, b) {
        return moment(a.timestamp, TIME_FORMAT).diff(moment(b.timestamp, TIME_FORMAT));
    });
    timeObj.shifts && timeObj.shifts.forEach((each, eachIndex) => {
        explanationArr.push(`${each.name}: ${getMomentTimeWithoutUndefined(each.timestamp)} | ${each.chronicLoadRatio}`)
    });

    /*
    Step 2: For each admitter, if chronic load ratio is >0.66, then deprioritize in the order 
    (either putting in back or pushing back by X spots depending on how great the ratio is)
    */
    const shiftsLessThanThreshold = [];
    const shiftsGreaterThanThreshold = [];
    explanationArr.push("\n");
    explanationArr.push(`Step 2: Determine the admitter"s with chronic load ratio >${CHRONIC_LOAD_RATIO_THRESHOLD}`);

    timeObj.shifts && timeObj.shifts.map((each, eachIndex) => {
        if (each.chronicLoadRatio > CHRONIC_LOAD_RATIO_THRESHOLD) {
            explanationArr.push(`${each.name}: ${getMomentTimeWithoutUndefined(each.timestamp)} | ${each.chronicLoadRatio}`);
            shiftsGreaterThanThreshold.push(each);
        } else {
            shiftsLessThanThreshold.push(each);
        }
        return true;
    });
    explanationArr.push("\n");
    explanationArr.push(`Step 3: Put the admitter"s with chronic load ratio >${CHRONIC_LOAD_RATIO_THRESHOLD} to the back of the queue`)
    const shiftsCombined = shiftsLessThanThreshold.concat(shiftsGreaterThanThreshold);

    shiftsCombined.forEach((each, eachIndex) => {
        explanationArr.push(`${each.name}: ${getMomentTimeWithoutUndefined(each.timestamp)} | ${each.chronicLoadRatio}`)
    });

    timeObj.shifts = shiftsCombined;

    setExplanation(explanationArr);

    const sortRoles = [];
    const sortRolesNameOnly = [];
    sortRoles.push("\n");
    timeObj && timeObj.shifts && timeObj.shifts.forEach((each, eachIndex) => {
        if (each.numberOfHoursWorked + "" !== "0") {
            sortRolesNameOnly.push(each.name);
            sortRoles.push(`${each.name} ${each.numberOfAdmissions} / ${each.numberOfHoursWorked} ${each.timestamp ? moment(each.timestamp, TIME_FORMAT).format(TIME_FORMAT) : "--:-- --"}`);
        }

    });
    sortRoles.push("\n");
    sortRoles.push(sortRolesNameOnly.length > 0 ? `\nOrder ${moment(timeObj.startTime, TIME_FORMAT).format(TIME_FORMAT)}` : "");
    sortRoles.push(`${sortRolesNameOnly.join(">")}`);

    setSorted(sortRoles);
    setSortedTableToDisplay(timeObj.shifts);
    setAdmissionsData(timeObj);
}

const getMomentTimeWithoutUndefined = (time) => {
    return time ? moment(time, TIME_FORMAT).format(TIME_FORMAT) : "--:-- --"
}

const getCompositeScore = (admission) => {
    let score = "";
    if (SCORE_NEW_ROLE[admission.startTime] && SCORE_NEW_ROLE[admission.startTime].includes(admission.name)) {
        const partB = 180 - admission.minutesWorkedFromStartTime;
        const partC = partB / 180;

        score = partC.toFixed(3);
    } else {
        const partA = Number(weight) * admission.chronicLoadRatio;
        const partB = 180 - admission.minutesWorkedFromStartTime;
        const partC = partB / 180;

        const partD = partC * (1 - Number(weight));
        const compositeScore = partA + partD;
        score = Number(compositeScore.toFixed(3));
    }
    return score ? score : "";
}

const sortByCompositeScore = (timeObj) => {
    timeObj && timeObj.shifts && timeObj.forEach.forEach((each, eachIndex) => {
        each["startTime"] = timeObj.startTime;
        each["minutesWorkedFromStartTime"] = getMinutesWorkedFromStartTime(each);
        each["numberOfHoursWorked"] = getNumberOfHoursWorked(each);
        each["chronicLoadRatio"] = getChronicLoadRatio(each);
        each["score"] = getCompositeScore(each);
    });

    timeObj && timeObj.shifts && timeObj.shifts.sort(function (a, b) {
        return a.score - b.score;
    });

    const explanationArr = [];
    explanationArr.push("Formula to get a composite score for each role:")
    timeObj && timeObj.shifts && timeObj.shifts.forEach((each, eachIndex) => {
        if (SCORE_NEW_ROLE[each.startTime] && SCORE_NEW_ROLE[each.startTime].includes(each.name)) {
            explanationArr.push(`Role ${each.name}: (180 - ${each.minutesWorkedFromStartTime}) / 180 = ${each.score}`);
        } else {
            explanationArr.push(`Role ${each.name}: (${weight} * ${each.chronicLoadRatio}) + (${(1 - weight).toFixed(3)} * (180 - ${each.minutesWorkedFromStartTime}) / 180) = ${each.score}`);
        }
    })
    setExplanation(explanationArr);

    const sortRoles = [];
    const sortRolesNameOnly = [];
    timeObj && timeObj.shifts && timeObj.shifts.forEach((each, eachIndex) => {
        sortRolesNameOnly.push(each.name);
        sortRoles.push(`${each.name} ${each.numberOfAdmissions} ${each.numberOfHoursWorked} ${getMomentTimeWithoutUndefined(each.timestamp)}`);

    });

    sortRoles.push(sortRolesNameOnly.length > 0 ? `\nOrder ${getMomentTimeWithoutUndefined(timeObj.startTime)}` : "");
    sortRoles.push(`${sortRolesNameOnly.join(">")}`);

    setSorted(sortRoles);
    setSortedTableToDisplay(timeObj.shifts);
    setAdmissionsData(timeObj);
}

const onChange = (e, admissionsId) => {
    const { name, value } = e.target

    const newObj = {};

    const updatedShifts = admissionsData && admissionsData.shifts && admissionsData.shifts.map((item) =>
        item.admissionsId === admissionsId && name ? { ...item, [name]: value } : item
    )

    updatedShifts.forEach((each, eachIndex) => {
        each["startTime"] = admissionsData.startTime;
        each["minutesWorkedFromStartTime"] = getMinutesWorkedFromStartTime(each);
        each["numberOfHoursWorked"] = getNumberOfHoursWorked(each);
        each["chronicLoadRatio"] = getChronicLoadRatio(each);
        each["score"] = getCompositeScore(each);
    });

    newObj["startTime"] = admissionsData.startTime;
    newObj["shifts"] = updatedShifts ? updatedShifts : [];

    setAdmissionsData(newObj);
    setSortedTableToDisplay(newObj.shifts);
    // sortMain(newObj);
    localStorage.setItem("admissionsData", JSON.stringify(newObj));
}

const getChronicLoadRatio = (admission) => {
    const timeDifference = admission.numberOfHoursWorked;
    const chronicLoadRatio = (Number(admission.numberOfAdmissions) / (Number(timeDifference))).toFixed(2);

    if (chronicLoadRatio == "NaN") {
        return "---";
    } else {
        return chronicLoadRatio;

    }

}

const getNumberOfHoursWorked = (admission) => {
    let startTime = "";
    SHIFT_TYPES.forEach((shift, shiftIndex) => {
        if (shift.type === admission.name) {
            startTime = shift.start;
        }
    });

    const now = admission.startTime;
    const timeDifference = moment(now, TIME_FORMAT).diff(moment(startTime, TIME_FORMAT), "hours", true).toFixed();
    return timeDifference;

}

const getMinutesWorkedFromStartTime = (admission) => {
    const now = getMomentTimeWithoutUndefined(admission.startTime);
    const timeDifference = moment(now, TIME_FORMAT).diff(moment(admission.timestamp, TIME_FORMAT), "minutes", true).toFixed();
    return timeDifference;
}

const timesDropdown = () => {
    return (
        <select
            className="timesdropdown"
            onChange={e => {
                const startTime = e.target.value;
                // const prevSelectedTime = admissionsData.startTime; //"16:00"

                // //4 goes to 5 and 5 goes to 7, but not in reverse
                // if (prevSelectedTime == "16:00" && startTime == "17:00"){
                //     //S1, S2, S3, S4 carry over from 4PM to 5PM

                // }
                // if ((prevSelectedTime == "17:00" && startTime == "19:00")){
                //     //S2, S3, S4, N5 carry over from 5PM to 7PM
                // }
                setSelectCustom(false);

                switch (startTime) {
                    case "FOURPM":
                        sortMain(FOURPM_DATA);
                        break;
                    case "FIVEPM":
                        // const prevS1_timestamp = "";
                        // const prevS1_numberOfAdmissions = "";

                        // const prevS2_timestamp = "";
                        // const prevS2_numberOfAdmissions = "";

                        // const prevS3 = "";
                        // const prevS4 = "";
                        // let FIVEPM_DATAX = FIVEPM_DATA;

                        // admissionsData.shifts.forEach((shift, shiftIndex) => {
                        //     if (CARRYOVER_FOUR_TO_FIVEPM.includes(shift.name)){
                        //         [`prev${shift.name}_timestamp`] = shift.timestamp;
                        //     }
                        // })

                        sortMain(FIVEPM_DATA);
                        break;
                    case "SEVENPM":
                        sortMain(SEVENPM_DATA);
                        break;
                    case "CUSTOM":
                        setSelectCustom(true);
                        sortMain(CUSTOM_DATA);
                        break;
                    default:
                        sortMain(FOURPM_DATA);
                        break;
                }

            }
            }>
            {START_TIMES.map((startTime, startTimeIndex) => {
                return (<option value={`${startTime.value}`}>{`${startTime.label}`}</option>);
            })}
        </select>
    );
}

const handleSort = (key) => {

    sortConfig[key] = !sortConfig[key];

    setSortConfig(sortConfig);

    const updatedShifts = admissionsData && [...admissionsData.shifts].sort((a, b) => {
        if (DATA_TYPE_TIME.includes(key)) {
            if (moment(a[key], TIME_FORMAT).isBefore(moment(b[key], TIME_FORMAT))) {
                return sortConfig[key] ? -1 : 1;
            } else {
                return sortConfig[key] ? 1 : -1;
            }
        } else if (DATA_TYPE_INT.includes(key)) {
            if (Number(a[key]) < Number(b[key])) {
                return sortConfig[key] ? -1 : 1;
            } else {
                return sortConfig[key] ? 1 : -1;
            }
        } else {
            if (a[key] < b[key]) {
                return sortConfig[key]? -1 : 1;
            } else {
                return sortConfig[key] ? 1 : -1;
            }
        }

    });
    setSortedTableToDisplay(updatedShifts);
};

const handleCustomTime = (target) => {
    const customTime = target;
    const customShifts = [];
    const customObj = {};
    let admissionId = 0;
    let userInputTime = moment(customTime, TIME_FORMAT);
    if (userInputTime.isBefore(moment("07:00", TIME_FORMAT))) {
        userInputTime = moment(customTime, TIME_FORMAT).add(1, "days");
    }

    SHIFT_TYPES.forEach((each, eachIndex) => {

        const momentStartWithThreshold = moment(each.startWithThreshold, TIME_FORMAT);
        let momentEndWithThreshold = moment(each.endWithThreshold, TIME_FORMAT);

        if (each.type.includes("N")) {
            momentEndWithThreshold = momentEndWithThreshold.add("1", "days");
        }

        if (userInputTime.isAfter(momentStartWithThreshold) && userInputTime.isBefore(momentEndWithThreshold)) {
            customShifts.push({
                admissionsId: admissionId + "",
                name: each.type,
                displayName: each.type + " " + each.displayStartTimeToEndTime,
                shiftTimePeriod: each.shiftTimePeriod,
                roleStartTime: each.start,
                numberOfAdmissions: "",
                timestamp: ""
            });
            admissionId++;
        }
    });
    customObj["startTime"] = customTime;
    customObj["shifts"] = customShifts;

    sortMain(customObj);
}

const sendEmail = (e, copiedContent, title) => {
    e.preventDefault();

    emailjs.send(CONFIG.REACT_APP_EMAILJS_SERVICE_ID, CONFIG.REACT_APP_EMAILJS_TEMPLATE_ID, { message: copiedContent, title: title }, CONFIG.REACT_APP_EMAILJS_PUBLIC_KEY).then(
        (response) => {
            console.log("SUCCESS!", response.status, response.text);
        },
        (error) => {
            console.log("FAILED...", error);
        },
    );

};
return (
    <div>
        <div className="header">
            <h1 className="title">S.A.D. Queue</h1>
            <h2 className="subtitle">Standardized Admissions Distribution</h2>
        </div>
        <div className="container">
            {timesDropdown()}
            {selectCustom && <input
                className="customtime"
                name="customTime"
                type="time"
                onChange={(e) => {
                    handleCustomTime(e.target.value);
                }}
                placeholder="Enter time"
                defaultValue={"12:00"}
            />}
            <table>
                <thead>
                    {openTable ? <tr>
                        {
                            EXPAND_TABLE.map((each, eachIndex) => {
                                return (
                                    <th onClick={() => handleSort(each[0])}>
                                        {each[1]} {sortConfig[each.name] ? (sortConfig[each.name] ? "↑" : "↓") : "↑"}
                                    </th>
                                );
                            })
                        }
                    </tr> :
                        <tr>
                            {
                                MINIMIZE_TABLE.map((each, eachIndex) => {
                                    return (
                                        <th onClick={() => handleSort(each[0])}>
                                            {each[1]} {sortConfig[each.name] ? (sortConfig[each.name] ? "↑" : "↓") : "↑"}
                                        </th>
                                    );
                                })
                            }
                        </tr>}
                </thead>
                <tbody>
                    {sortedTableToDisplay.map((admission) => (
                        !admission.isStatic &&
                        <tr
                            className={admissionsData.shifts && admissionsData.shifts && admissionsData.shifts.length > 0 && admissionsData.shifts[0].name === admission.name ? "firstup" : ""}
                            key={admission.admissionsId}>
                            <td>
                                <input
                                    name="name"
                                    value={admission.name}
                                    type="text"
                                    disabled={true}
                                />
                            </td>
                            {openTable && <td>
                                <input
                                    name="shiftTimePeriod"
                                    value={admission.shiftTimePeriod}
                                    type="text"
                                    disabled={true}
                                />
                            </td>}
                            <td className="usercanedit">
                                <input
                                    name="numberOfAdmissions"
                                    value={admission.numberOfAdmissions}
                                    step="1"
                                    type="number"
                                    placeholder="---"
                                    onChange={(e) => onChange(e, admission.admissionsId)}
                                    disabled={admission.isStatic}
                                />
                            </td>
                            <td className="usercanedit">
                                <input
                                    name="timestamp"
                                    value={admission.timestamp}
                                    type="time"
                                    onChange={(e) => onChange(e, admission.admissionsId)}
                                    disabled={admission.isStatic}
                                />
                            </td>
                            <td>
                                <input
                                    name="chronicLoadRatio"
                                    type="text"
                                    value={admission.chronicLoadRatio}
                                    disabled={true}
                                    disabled={true}
                                />
                            </td>
                            {openTable && <td>
                                <input
                                    name="numberHoursWorked"
                                    value={admission.numberOfHoursWorked}
                                    type="number"
                                    placeholder="Enter number"
                                    disabled={true}
                                />
                            </td>}
                            {openTable && <td>
                                <input
                                    name="score"
                                    type="text"
                                    value={admission.score}
                                    disabled={true}
                                />
                            </td>}

                        </tr>
                    ))}
                </tbody>
            </table>
            <button className="seedetails" onClick={() => {
                setOpenTable(!openTable);
            }}>{openTable ? "Minimize Table" : "Expand Table"}</button>
            <section style={{ textAlign: "center", margin: "30px" }}>
                <button onClick={() => {
                    sortMain(admissionsData);
                    if (admissionsData && admissionsData.shifts) {
                        setSortedTableToDisplay(admissionsData.shifts);
                    }
                }}>
                    Generate Queue
                </button>
            </section>

            <fieldset className="fieldsettocopy">
                {admissionsData.shifts && admissionsData.shifts.length > 0 && <img
                    alt="copy button"
                    className="copybutton"
                    src={copybutton}
                    onClick={(ev) => {
                        const forWhatTime = moment(admissionsData.startTime, TIME_FORMAT).format("h:mmA");

                        let copiedMessage = "";
                        sorted.map((each, eachIndex) => {
                            if (each == "\n") {
                            } else {
                                copiedMessage += each + "\n";
                            }
                        });


                        const title = `Admissions by ${forWhatTime}`;

                        navigator.clipboard.writeText(`${copiedMessage}`);
                        // sendEmail(ev, copiedMessage, title);

                    }} />}

                <p className="boldCopy">
                    <br />
                    {admissionsData.startTime ? `Admissions by ${moment(admissionsData.startTime, TIME_FORMAT).format(TIME_FORMAT)}` : `Select a time. No roles in the queue.`}
                </p>
                {
                    sorted && sorted.map((each, eachIndex) => {
                        if (each == "\n") {
                            return <br></br>
                        } else if (eachIndex == sorted.length - 1) {
                            return <div className="sortedWithButton">
                                <p>{each}
                                    {admissionsData.shifts && admissionsData.shifts.length > 0 && <img
                                        alt="copy button"
                                        className="copybuttonjust1line"
                                        src={copybutton}
                                        onClick={(ev) => {

                                            navigator.clipboard.writeText(sorted[sorted.length - 1]);
                                            // sendEmail(ev, copiedMessage, title);

                                        }} />}
                                </p>

                            </div>

                        } else {
                            return <p className="sorted">{each}</p>
                        }
                    })
                }

            </fieldset>
            <p className="admissionsorderlastline">{ADMISSIONS_FORMAT}</p>

            <button className="seedetails" onClick={() => {
                setSeeDetails(!seeDetails);
            }
            }>{seeDetails ? "Hide Explanation" : "Show Explanation"}</button>

            {seeDetails && <fieldset className="notes">
                <p className="bold">Explanation</p>

                {explanation && explanation.map((line, lineIndex) => {
                    if (line == "\n") {
                        return <br></br>
                    } else {
                        return <p>{line}</p>
                    }
                })}
                {/* Set Weight <input
                    className="weight"
                    name="weight"
                    type="number"
                    step=".1"
                    value={weight}
                    onChange={(ev) => {
                        setWeight(ev.target.value);
                    }}
                    placeholder={"Set weight"}
                /> */}
            </fieldset>}

            <div className="footer">
                <img
                    alt="copy button"
                    className="copybutton"
                    src={githublogo}
                    onClick={(ev) => {
                        window.location.href = "https://github.com/sadqueue/sad/tree/main";
                    }} />
            </div>
        </div>
    </div>
)

}

export default App;
