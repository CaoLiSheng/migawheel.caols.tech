import {Injectable} from "@angular/core";
import {AnalysisResult, Period} from "./migawheel.search";
import {Configs} from "./migawheel.core";
import {DaoUtil} from "../dao/dao.util";
import {Observable} from "rxjs";
import "rxjs/add/operator/map";
import {API} from "../../const/api.const";

@Injectable()
export class MigaWheelDao {

    constructor(private dao: DaoUtil) {
    }

    categories(): Observable<any[]> {
        return this.dao.get(API.getAPI('categories'))
            .map(res => res.json());
    }

    posts(category: string): Observable<string[]> {
        return this.dao.get(API.getAPI('posts')(category))
            .map(res => {
                let ret = res.json();
                if (ret.code !== 20000) {
                    alert(ret.body);
                    return;
                }

                return ret.body.map(k => k.name + '[]' + k.create.substr(0, '1991-11-06'.length) + '||' + k.update.substr(0, '1991-11-06'.length));
            });
    }

    private isNullObj(obj: any): boolean {
        for (let keys = Object.keys(obj), i = 0;
             i < keys.length; i++) {
            if (obj[keys[i]]) {
                return false;
            }
        }
        return true;
    }

    private isUseDateIndex(analysis: AnalysisResult[]): boolean {
        for (let i = 0; i < analysis.length; i++) {
            for (let keys = Object.keys(analysis[i]),
                     j = 0; j < keys.length; j++) {
                if ('mode' !== keys[j] && 'keyWords' !== keys[j]) {
                    if (!this.isNullObj(analysis[i][keys[j]])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private pickAnalysisResult(mode: string, analysis: AnalysisResult[]): AnalysisResult {
        for (let i = 0; i < analysis.length; i++) {
            if (mode === analysis[i].mode) {
                return analysis[i];
            }
        }
        return null;
    }

    private generateExamFn(period: Period): Function {
        if (!period.start) {
            return function () {
                return true;
            }
        }

        if (!period.end) {
            return function (toExam: number) {
                return toExam === period.start;
            }
        }

        return function (toExam: number) {
            return toExam >= period.start && toExam <= period.end;
        }
    }

    private exam(obj: any, examSeed: any, cb: Function) {
        Object.keys(obj).forEach(key => {
            let examFn = this.generateExamFn(examSeed);
            let examRet = examFn(parseInt(key));

            // console.log(key, obj[key], examRet);

            if (examRet) {
                cb(obj[key]);
            }
        });
    }

    search(analysis: AnalysisResult[]): Observable<string[]> {
        // console.log(analysis);

        if (analysis.length === 1) {
            if (analysis[0].mode === Configs.CategoryMode) {
                let searchCategory = this.dao.post(API.getAPI("SearchCategory"), {
                    yearStart: analysis[0].year.start,
                    yearEnd: analysis[0].year.end,
                    monthStart: analysis[0].month.start,
                    monthEnd: analysis[0].month.end,
                    dayStart: analysis[0].day.start,
                    dayEnd: analysis[0].day.end,
                    keywords: analysis[0].keyWords,
                    platform: 'All,Pc'
                }).map(res => res.json());

                return new Observable<String[]>(observer => {
                    searchCategory.subscribe(ret =>
                        DaoUtil.process(ret, function (categories) {
                            let categoryNames = [];
                            categories.forEach(category => categoryNames.push(category.name));
                            observer.next(categoryNames);
                            observer.complete();
                        }), error => DaoUtil.logError(error)
                    );
                });
            } else if (analysis[0].mode === Configs.PostMode) {
                let searchPost = this.dao.post(API.getAPI("SearchPost"), {
                    yearStart: analysis[0].year.start,
                    yearEnd: analysis[0].year.end,
                    monthStart: analysis[0].month.start,
                    monthEnd: analysis[0].month.end,
                    dayStart: analysis[0].day.start,
                    dayEnd: analysis[0].day.end,
                    keywords: analysis[0].keyWords,
                    platform: 'All,Pc'
                }).map(res => res.json());

                return new Observable<String[]>(observer => {
                    searchPost.subscribe(ret =>
                        DaoUtil.process(ret, function (posts) {
                            let postRenders = [];
                            posts.forEach(post => postRenders.push(post.name + '[]'
                                + post.create.substr(0, '1991-11-06'.length) + '||'
                                + post.update.substr(0, '1991-11-06'.length)));
                            observer.next(postRenders);
                            observer.complete();
                        }), error => DaoUtil.logError(error)
                    );
                });
            }
        } else if (analysis.length === 2) {
            let categoryAnalysis = this.pickAnalysisResult(Configs.CategoryMode, analysis),
                postAnalysis = this.pickAnalysisResult(Configs.PostMode, analysis);

            let searchPost = this.dao.post(API.getAPI("SearchPostWithCategory"), {
                category: {
                    yearStart: categoryAnalysis.year.start,
                    yearEnd: categoryAnalysis.year.end,
                    monthStart: categoryAnalysis.month.start,
                    monthEnd: categoryAnalysis.month.end,
                    dayStart: categoryAnalysis.day.start,
                    dayEnd: categoryAnalysis.day.end,
                    keywords: categoryAnalysis.keyWords,
                    platform: 'All,Pc'
                },
                post: {
                    yearStart: postAnalysis.year.start,
                    yearEnd: postAnalysis.year.end,
                    monthStart: postAnalysis.month.start,
                    monthEnd: postAnalysis.month.end,
                    dayStart: postAnalysis.day.start,
                    dayEnd: postAnalysis.day.end,
                    keywords: postAnalysis.keyWords,
                    platform: 'All,Pc'
                }
            }).map(res => res.json());

            return new Observable<String[]>(observer => {
                searchPost.subscribe(ret =>
                    DaoUtil.process(ret, function (posts) {
                        let postRenders = [];
                        posts.forEach(post => postRenders.push(post.name + '[]'
                            + post.create.substr(0, '1991-11-06'.length) + '||'
                            + post.update.substr(0, '1991-11-06'.length)));
                        observer.next(postRenders);
                        observer.complete();
                    }), error => DaoUtil.logError(error)
                );
            });
        }

        // let dateIndex: Observable<any>,
        //     categories: Observable<any>,
        //     posts: Observable<any>,
        //     isUseIndex = this.isUseDateIndex(analysis),
        //     categoryAnalysis = this.pickAnalysisResult(Configs.CategoryMode, analysis),
        //     postAnalysis = this.pickAnalysisResult(Configs.PostMode, analysis),
        //     categoryNames: string[] = [],
        //     postTitles: string[] = [];
        //
        // if (isUseIndex) {
        //     dateIndex = this.dao.get(API.getAPI('date_index'))
        //         .map(res => res.json());
        // }
        //
        // if (categoryAnalysis) {
        //     categories = this.dao.get(API.getAPI('category'))
        //         .map(res => res.json());
        // }
        //
        // if (postAnalysis) {
        //     posts = this.dao.get(API.getAPI('post'))
        //         .map(res => res.json());
        //
        //     if (isUseIndex) {
        //         if (categoryAnalysis) {
        //             return new Observable<string[]>(observer => {
        //                 dateIndex.subscribe(dateIndexRet => {
        //                     categories.subscribe(categoryRet => {
        //                         posts.subscribe(postRet => {
        //                             this.exam(dateIndexRet, categoryAnalysis.year, passedYear =>
        //                                 this.exam(passedYear, categoryAnalysis.month, passedMonth =>
        //                                     this.exam(passedMonth, categoryAnalysis.day, passedDay =>
        //                                         categoryNames = categoryNames.concat(passedDay.categories)
        //                                     )
        //                                 )
        //                             );
        //
        //                             categoryNames = categoryNames.filter(cn =>
        //                                 categoryAnalysis.keyWords.reduce((p: boolean, v: string) =>
        //                                     p && cn.indexOf(v) !== -1
        //                                     , true));
        //
        //                             this.exam(dateIndexRet, postAnalysis.year, passedYear =>
        //                                 this.exam(passedYear, postAnalysis.month, passedMonth =>
        //                                     this.exam(passedMonth, postAnalysis.day, passedDay =>
        //                                         postTitles = postTitles.concat(passedDay.posts)
        //                                     )
        //                                 )
        //                             );
        //
        //                             observer.next(postTitles.filter(pt =>
        //                                 categoryNames.reduce((p: boolean, cn: string) =>
        //                                 p || cn === postRet[pt].category, false)
        //                             ).filter(pt =>
        //                                 postAnalysis.keyWords.reduce((p: boolean, v: string) =>
        //                                     p && pt.indexOf(v) !== -1
        //                                     , true)
        //                             ).map(pt => pt + '[]' + postRet[pt].create + '||' + postRet[pt].update));
        //                             observer.complete();
        //                         });
        //                     });
        //                 });
        //             });
        //         } else {
        //             return new Observable<string[]>(observer => {
        //                 dateIndex.subscribe(dateIndexRet => {
        //                     posts.subscribe(postRet => {
        //                         this.exam(dateIndexRet, postAnalysis.year, passedYear =>
        //                             this.exam(passedYear, postAnalysis.month, passedMonth =>
        //                                 this.exam(passedMonth, postAnalysis.day, passedDay =>
        //                                     postTitles = postTitles.concat(passedDay.posts)
        //                                 )
        //                             )
        //                         );
        //
        //                         observer.next(postTitles.filter(pt =>
        //                             postAnalysis.keyWords.reduce((p: boolean, v: string) =>
        //                                 p && pt.indexOf(v) !== -1
        //                                 , true))
        //                             .map(pt => pt + '[]' + postRet[pt].create + '||' + postRet[pt].update));
        //                         observer.complete();
        //                     });
        //                 });
        //             });
        //         }
        //     } else {
        //         if (categoryAnalysis) {
        //             return new Observable<string[]>(observer => {
        //                 categories.subscribe(categoryRet => {
        //                     posts.subscribe(postRet => {
        //                         observer.next(Object.keys(categoryRet).reduce((pts: string[], cn: string) => {
        //                             if (categoryAnalysis.keyWords.reduce((p: boolean, v: string) =>
        //                                     p && cn.indexOf(v) !== -1
        //                                     , true)) {
        //                                 return pts.concat(categoryRet[cn].posts);
        //                             } else {
        //                                 return pts;
        //                             }
        //                         }, []).filter(pt =>
        //                             postAnalysis.keyWords.reduce((p: boolean, v: string) =>
        //                                 p && pt.indexOf(v) !== -1
        //                                 , true))
        //                             .map(pt => pt + '[]' + postRet[pt].create + '||' + postRet[pt].update));
        //                         observer.complete();
        //                     });
        //                 });
        //             });
        //         } else {
        //             return posts.map(ret => Object.keys(ret).filter(pt =>
        //                 postAnalysis.keyWords.reduce((p: boolean, v: string) =>
        //                     p && pt.indexOf(v) !== -1
        //                     , true))
        //                 .map(pt => pt + '[]' + ret[pt].create + '||' + ret[pt].update));
        //         }
        //     }
        // } else {
        //     if (categoryAnalysis) {
        //         if (isUseIndex) {
        //             return dateIndex.map(ret => {
        //                 this.exam(ret, categoryAnalysis.year, passedYear =>
        //                     this.exam(passedYear, categoryAnalysis.month, passedMonth =>
        //                         this.exam(passedMonth, categoryAnalysis.day, passedDay =>
        //                             categoryNames = categoryNames.concat(passedDay.categories)
        //                         )
        //                     )
        //                 );
        //                 return categoryNames.filter(cn =>
        //                     categoryAnalysis.keyWords.reduce((p: boolean, v: string) =>
        //                         p && cn.indexOf(v) !== -1
        //                         , true));
        //             });
        //         } else {
        //             return categories.map(ret => {
        //                 return Object.keys(ret).filter(cn =>
        //                     categoryAnalysis.keyWords.reduce((p: boolean, v: string) =>
        //                         p && cn.indexOf(v) !== -1
        //                         , true));
        //             });
        //         }
        //     }
        // }

        return new Observable<string[]>(observer => observer.complete());
    }

}
