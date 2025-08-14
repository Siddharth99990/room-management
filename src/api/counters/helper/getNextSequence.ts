import Counter from '../counter.model';

export const getNextSequence=async (counterName:String):Promise<number>=>{
    const counter=await Counter.findByIdAndUpdate(
        counterName,
        {$inc:{sequencecounter:1}},
        {new:true,upsert:true}
    );
    return counter.sequencecounter;
};