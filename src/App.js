import './App.css';
import React from "react";
import moment from "moment";

const SHIFT_TYPES = [
    {
        type: "S1",
        start: "10:00",
        end: "20:00"
    },
    {
        type: "S2",
        start: "11:00",
        end: "21:00"
    },
    {
        type: "S3",
        start: "13:00",
        end: "23:00"
    },
    {
        type: "S4",
        start: "14:00",
        end: "00:00"
    },
    {
        type: "N5",
        start: "17:00",
        end: "05:00"
    },
    {
        type: "DA",
        start: "07:00",
        end: "19:00"
    }
];
const data = [
    {
        admissionsId: '01',
        name: 'S1',
        numberOfAdmissions: "1",
        timestamp: '18:17',
        isTwoAdmits: false,
        chronicLoadRatio: ""
    },
    {
        admissionsId: '02',
        name: 'S2',
        numberOfAdmissions: "2",
        timestamp: '18:28',
        isTwoAdmits: false,
        chronicLoadRatio: ""
    },
    {
        admissionsId: '03',
        name: 'S3',
        numberOfAdmissions: "3",
        timestamp: '18:13',
        isTwoAdmits: false,
        chronicLoadRatio: ""
    },
    {
        admissionsId: '04',
        name: 'S4',
        numberOfAdmissions: "2",
        timestamp: '17:08',
        isTwoAdmits: false,
        chronicLoadRatio: ""
    },
    {
        admissionsId: '05',
        name: 'N5',
        numberOfAdmissions: "2",
        timestamp: '18:53',
        isTwoAdmits: true,
        chronicLoadRatio: ""
    },
]


export function App() {
    const [admissionsData, setAdmissionsData] = React.useState(data)
    const [sorted, setSorted] = React.useState("");
    const [displayOrderOfAdmissions, setDisplayOrderOfAdmissions] = React.useState(false);

    const onChange = (e, admissionsId) => {
        const { name, value } = e.target

        const editData = admissionsData.map((item) =>
            item.admissionsId === admissionsId && name ? { ...item, [name]: value } : item
        )

        setAdmissionsData(editData)
    }

    /* 
    Chronic Load = number of admissions / numbers of hours worked 

    S1 = 10AM-8PM
    S2 = 11AM-9PM
    S3 = 1PM-11AM
    S4 = 2PM-12AM
    N5 = 5PM-5AM
    DA = 7AM-7PM

    */
    const getChronicLoadRatio = (name, numberOfAdmissions, timestamp) => {
        const startTime = SHIFT_TYPES.map((shift, shiftIndex) => {
            if (shift.type == name){
                return shift.start;
            }
        });
        const timeStampMoment = moment(timestamp, 'HH:mm');
        const timeDifference = moment(startTime, 'HH:mm').diff(timeStampMoment, "hours", true);

        const chronicLoadRatio = (Number(numberOfAdmissions) / (timeDifference)).toFixed(2);
        return chronicLoadRatio;
    }

    const chronicLoadVal = 1;
    return (
        <div className="container">
            <h1 className="title">SAD Queue Generator</h1>
            <h2>Standardized Admissions Distributor</h2>
            <table>
                <thead>
                    <tr>
                        <th>Role</th>
                        <th># of Admissions</th>
                        <th>Last Admin Timestamp</th>
                        {/* <th>Two Admits 5-7PM</th> */}
                        <th>Chronic Load Ratio</th>
                    </tr>
                </thead>
                <tbody>
                    {admissionsData.map(({ admissionsId, name, numberOfAdmissions, timestamp, isTwoAdmits, chronicLoadRatio }) => (
                        <tr key={admissionsId}>
                            <td>
                                <input
                                    name="name"
                                    value={name}
                                    type="text"
                                    onChange={(e) => onChange(e, admissionsId)}
                                />
                            </td>
                            <td>
                                <input
                                    name="numberOfAdmissions"
                                    value={numberOfAdmissions}
                                    type="text"
                                    onChange={(e) => onChange(e, admissionsId)}
                                />
                            </td>
                            <td>
                                <input
                                    name="timestamp"
                                    value={timestamp}
                                    type="time"
                                    onChange={(e) => onChange(e, admissionsId)}
                                />
                            </td>
                            {/* <td>
                                <input
                                    name="isTwoAdmits"
                                    type="checkbox"
                                    value={isTwoAdmits}
                                    onChange={(e) => onChange(e, admissionsId)}
                                />
                            </td> */}
                            <td>
                                <input
                                    name="chronicLoad"
                                    type="text"
                                    value={getChronicLoadRatio(name, numberOfAdmissions, timestamp)}
                                    onChange={(e) => onChange(e, admissionsId)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <section style={{ textAlign: "center", margin: "30px" }}>
                <button
                    onClick={(ev) => {
                        admissionsData.sort(function (a, b) {
                            return a.timestamp.localeCompare(b.timestamp);
                        });
                        const sortRoles = [];
                        admissionsData.forEach((each, eachIndex) => {
                            sortRoles.push(each.name);
                        })
                        setSorted(sortRoles.join(", "));
                        setAdmissionsData(admissionsData);
                        setDisplayOrderOfAdmissions(true);
                    }}>
                    Generate Queue
                </button>
            </section>
            {sorted && displayOrderOfAdmissions &&
                <fieldset>
                    <button
                     onClick={(ev) => {
                        navigator.clipboard.writeText(`Order of Admissions (7PM): ${sorted}`);
                    }}>Copy</button>
                    {/* <button className="close" onClick={(ev) => {
                        setDisplayOrderOfAdmissions(false);
                    }}>Close</button> */}
                    <h1>
                        {`Order of Admissions (7PM):`}
                    </h1>
                    <h1>{`${sorted}`}</h1>
                </fieldset>
            }
        </div>
    )

}

export default App;
